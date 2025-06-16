import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Fix __dirname for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: ['http://localhost:5173', 'https://localhost:5173'],
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Database setup with better error handling
const dbPath = path.join(__dirname, 'database.db');
const dbDir = path.dirname(dbPath);

// Ensure database directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db;

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    // Remove any existing database file to start fresh
    if (fs.existsSync(dbPath)) {
      try {
        fs.unlinkSync(dbPath);
        console.log('Removed existing database file');
      } catch (err) {
        console.log('Could not remove existing database file:', err.message);
      }
    }

    db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');

      // Configure SQLite for better performance and reliability
      db.serialize(() => {
        db.run('PRAGMA journal_mode = WAL;');
        db.run('PRAGMA synchronous = NORMAL;');
        db.run('PRAGMA cache_size = 1000;');
        db.run('PRAGMA temp_store = memory;');
        db.run('PRAGMA busy_timeout = 30000;'); // 30 second timeout
        
        resolve();
      });
    });
  });
}

function createTables() {
  return new Promise((resolve, reject) => {
    console.log('Creating database schema...');

    const schema = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        balance REAL DEFAULT 200.0,
        is_admin BOOLEAN DEFAULT 0,
        initial_deposit_made BOOLEAN DEFAULT 0,
        total_bets REAL DEFAULT 0,
        required_bet_amount REAL DEFAULT 200,
        consecutive_wins INTEGER DEFAULT 0,
        hack_mode_enabled BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Bank details table
      CREATE TABLE IF NOT EXISTS bank_details (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE,
        bank_name TEXT NOT NULL,
        account_number TEXT NOT NULL,
        ifsc_code TEXT NOT NULL,
        account_holder_name TEXT NOT NULL,
        is_locked BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

      -- Transactions table
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        details TEXT,
        utr_number TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

      -- Games table
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        game_period TEXT NOT NULL,
        bet_amount REAL NOT NULL,
        mines_count INTEGER NOT NULL,
        mine_positions TEXT,
        revealed_positions TEXT,
        multiplier REAL DEFAULT 1.0,
        status TEXT DEFAULT 'active',
        winnings REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

      -- Game periods table
      CREATE TABLE IF NOT EXISTS game_periods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        period_id TEXT UNIQUE NOT NULL,
        mine_positions TEXT NOT NULL,
        start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_time DATETIME,
        status TEXT DEFAULT 'active'
      );

      -- Admin settings table
      CREATE TABLE IF NOT EXISTS admin_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
      CREATE INDEX IF NOT EXISTS idx_games_period ON games(game_period);
      CREATE INDEX IF NOT EXISTS idx_periods_id ON game_periods(period_id);
    `;

    db.exec(schema, (err) => {
      if (err) {
        console.error('Error creating tables:', err);
        reject(err);
        return;
      }

      // Insert default admin user if not exists
      db.get(
        'SELECT id FROM users WHERE username = ?',
        ['admin'],
        (err, row) => {
          if (err) {
            console.error('Error checking admin user:', err);
            reject(err);
            return;
          }

          if (!row) {
            const hashedPassword = bcrypt.hashSync('admin123', 10);
            db.run(
              'INSERT INTO users (username, email, password, is_admin, balance) VALUES (?, ?, ?, ?, ?)',
              ['admin', 'admin@minex.com', hashedPassword, 1, 0],
              (err) => {
                if (err) {
                  console.error('Error creating admin user:', err);
                  reject(err);
                  return;
                }
                console.log('Default admin user created');
                resolve();
              }
            );
          } else {
            resolve();
          }
        }
      );
    });
  });
}

// Game state management
let currentPeriod = '';
let nextPeriod = '';
let periodStartTime = null;
let periodTimer = null;

// Generate random mine positions for a period
function generateMinePositions(count = 3) {
  const positions = [];
  while (positions.length < count) {
    const pos = Math.floor(Math.random() * 25);
    if (!positions.includes(pos)) {
      positions.push(pos);
    }
  }
  return positions.sort((a, b) => a - b);
}

// Generate period ID
function generatePeriodId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hour}${minute}${second}`;
}

// Start new game period with better error handling
function startNewPeriod() {
  const newPeriodId = generatePeriodId();
  const minePositions = generateMinePositions(3); // Default 3 mines per period

  // End current period
  if (currentPeriod) {
    db.run(
      'UPDATE game_periods SET end_time = CURRENT_TIMESTAMP, status = ? WHERE period_id = ?',
      ['ended', currentPeriod],
      (err) => {
        if (err) {
          console.error('Error ending current period:', err);
        }
      }
    );

    // Auto-cashout all active games from previous period
    db.all(
      'SELECT * FROM games WHERE status = ? AND game_period = ?',
      ['active', currentPeriod],
      (err, games) => {
        if (!err && games) {
          games.forEach((game) => {
            const winnings = game.bet_amount * game.multiplier;

            // Update game status
            db.run(
              'UPDATE games SET status = ?, winnings = ? WHERE id = ?',
              ['won', winnings, game.id],
              (err) => {
                if (!err) {
                  // Update user balance
                  db.run(
                    'UPDATE users SET balance = balance + ? WHERE id = ?',
                    [winnings, game.user_id]
                  );

                  // Add transaction record
                  db.run(
                    'INSERT INTO transactions (user_id, type, amount, status, details) VALUES (?, ?, ?, ?, ?)',
                    [
                      game.user_id,
                      'bonus',
                      winnings,
                      'completed',
                      `Auto-cashout from game period ${currentPeriod}`,
                    ]
                  );

                  // Emit auto-cashout event
                  io.emit('autoCashout', {
                    gameId: game.id,
                    winnings: winnings,
                    reason: 'Period ended - auto cashout',
                  });
                }
              }
            );
          });
        }
      }
    );
  }

  // Set new period
  currentPeriod = newPeriodId;
  nextPeriod = generatePeriodId();
  periodStartTime = Date.now();

  // Save new period to database with retry logic
  const savePeriod = (retries = 3) => {
    db.run(
      'INSERT INTO game_periods (period_id, mine_positions, start_time, status) VALUES (?, ?, CURRENT_TIMESTAMP, ?)',
      [currentPeriod, JSON.stringify(minePositions), 'active'],
      (err) => {
        if (err) {
          console.error('Error saving new period:', err);
          if (retries > 0) {
            console.log(`Retrying to save period... (${retries} attempts left)`);
            setTimeout(() => savePeriod(retries - 1), 1000);
          } else {
            console.error('Failed to save period after all retries');
          }
        } else {
          // Only log period start without sensitive mine positions
          console.log(`New game period started: ${currentPeriod}`);

          // Emit period update to all clients
          io.emit('periodUpdate', {
            currentPeriod,
            nextPeriod,
            timeRemaining: 60000,
            startTime: periodStartTime,
            // Only send mine positions to authenticated admin users
          });

          // Send mine positions only to admin users via separate event
          io.sockets.sockets.forEach((socket) => {
            if (socket.isAdmin) {
              socket.emit('currentMinePositions', {
                period: currentPeriod,
                positions: minePositions,
              });
            }
          });
        }
      }
    );
  };

  savePeriod();
}

// Initialize game periods
function initializeGamePeriods() {
  console.log('Initializing game periods...');
  startNewPeriod();

  // Set up 60-second period timer
  periodTimer = setInterval(() => {
    console.log(`Period ${currentPeriod} ending, starting new period...`);
    startNewPeriod();
  }, 60000);
}

// JWT middleware with better error handling
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, 'your-secret-key', (err, user) => {
    if (err) {
      // Handle token expiration specifically
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired', expired: true });
      }
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

// Admin middleware
function requireAdmin(req, res, next) {
  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Routes

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    db.get(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email],
      async (err, row) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (row) {
          return res
            .status(400)
            .json({ error: 'Username or email already exists' });
        }

        // Hash password and create user
        const hashedPassword = await bcrypt.hash(password, 10);

        db.run(
          'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
          [username, email, hashedPassword],
          function (err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to create user' });
            }

            // Create JWT token with longer expiration
            const token = jwt.sign(
              { id: this.lastID, username, email, is_admin: false },
              'your-secret-key',
              { expiresIn: '7d' } // Extended to 7 days
            );

            // Add welcome bonus transaction
            db.run(
              'INSERT INTO transactions (user_id, type, amount, status, details) VALUES (?, ?, ?, ?, ?)',
              [this.lastID, 'bonus', 200, 'completed', 'Welcome bonus']
            );

            res.json({
              token,
              user: {
                id: this.lastID,
                username,
                email,
                balance: 200,
                is_admin: false,
                initial_deposit_made: false,
                total_bets: 0,
                required_bet_amount: 200,
              },
            });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: 'Username and password are required' });
    }

    db.get(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, username],
      async (err, user) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
          return res.status(400).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Create JWT token with longer expiration
        const token = jwt.sign(
          {
            id: user.id,
            username: user.username,
            email: user.email,
            is_admin: user.is_admin,
          },
          'your-secret-key',
          { expiresIn: '7d' } // Extended to 7 days
        );

        res.json({
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            balance: user.balance,
            is_admin: user.is_admin,
            initial_deposit_made: user.initial_deposit_made,
            total_bets: user.total_bets,
            required_bet_amount: user.required_bet_amount,
          },
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user profile
app.get('/api/user/profile', authenticateToken, (req, res) => {
  db.get('SELECT * FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      balance: user.balance,
      is_admin: user.is_admin,
      initial_deposit_made: user.initial_deposit_made,
      total_bets: user.total_bets,
      required_bet_amount: user.required_bet_amount,
    });
  });
});

// Get bank details
app.get('/api/user/bank-details', authenticateToken, (req, res) => {
  db.get(
    'SELECT * FROM bank_details WHERE user_id = ?',
    [req.user.id],
    (err, bankDetails) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Always return a valid JSON object, even if no bank details exist
      res.json(bankDetails || {});
    }
  );
});

// Start game
app.post('/api/game/start', authenticateToken, (req, res) => {
  try {
    const { betAmount, minesCount } = req.body;
    const userId = req.user.id;

    if (!betAmount || betAmount < 10 || betAmount > 10000) {
      return res.status(400).json({ error: 'Invalid bet amount' });
    }

    if (!minesCount || minesCount < 1 || minesCount > 24) {
      return res.status(400).json({ error: 'Invalid mines count' });
    }

    // Check if admin
    if (!req.user.is_admin) {
      // Check user balance
      db.get(
        'SELECT balance FROM users WHERE id = ?',
        [userId],
        (err, user) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          if (!user || user.balance < betAmount) {
            return res.status(400).json({ error: 'Insufficient balance' });
          }

          // Deduct bet amount
          db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [
            betAmount,
            userId,
          ]);
        }
      );
    }

    // Get current period mine positions
    db.get(
      'SELECT mine_positions FROM game_periods WHERE period_id = ?',
      [currentPeriod],
      (err, period) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        let minePositions = [];
        if (period) {
          minePositions = JSON.parse(period.mine_positions);
        } else {
          // Fallback: generate random positions
          minePositions = generateMinePositions(minesCount);
        }

        // Check for controlled loss pattern (non-admin users only)
        if (!req.user.is_admin) {
          db.get(
            'SELECT consecutive_wins, hack_mode_enabled FROM users WHERE id = ?',
            [userId],
            (err, userData) => {
              if (
                !err &&
                userData &&
                userData.consecutive_wins >= 2 &&
                !userData.hack_mode_enabled
              ) {
                // Force loss pattern: mine will appear on 3rd click
                console.log(
                  `User ${req.user.username} is in controlled loss pattern (${userData.consecutive_wins} consecutive wins)`
                );
              }
            }
          );
        }

        // Create game record
        db.run(
          'INSERT INTO games (user_id, game_period, bet_amount, mines_count, mine_positions, status) VALUES (?, ?, ?, ?, ?, ?)',
          [
            userId,
            currentPeriod,
            betAmount,
            minesCount,
            JSON.stringify(minePositions),
            'active',
          ],
          function (err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to create game' });
            }

            const gameId = this.lastID;
            const baseMultiplier = getBaseMultiplier(minesCount);

            res.json({
              gameId,
              gamePeriod: currentPeriod,
              baseMultiplier,
              currentMultiplier: 1.0,
              minePositions: req.user.is_admin ? minePositions : [], // Only send to admin
            });

            // Emit game started event
            io.emit('gameStarted', {
              gameId,
              gamePeriod: currentPeriod,
              baseMultiplier,
              currentMultiplier: 1.0,
            });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Reveal cell
app.post('/api/game/reveal', authenticateToken, (req, res) => {
  try {
    const { gameId, position } = req.body;
    const userId = req.user.id;

    if (position < 0 || position > 24) {
      return res.status(400).json({ error: 'Invalid position' });
    }

    // Get game data
    db.get(
      'SELECT * FROM games WHERE id = ? AND user_id = ? AND status = ?',
      [gameId, userId, 'active'],
      (err, game) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (!game) {
          return res
            .status(404)
            .json({ error: 'Game not found or not active' });
        }

        const minePositions = JSON.parse(game.mine_positions);
        const revealedPositions = game.revealed_positions
          ? JSON.parse(game.revealed_positions)
          : [];

        if (revealedPositions.includes(position)) {
          return res.status(400).json({ error: 'Position already revealed' });
        }

        // Check for controlled loss pattern (non-admin users only)
        let forceLoss = false;
        if (!req.user.is_admin) {
          db.get(
            'SELECT consecutive_wins, hack_mode_enabled FROM users WHERE id = ?',
            [userId],
            (err, userData) => {
              if (
                !err &&
                userData &&
                userData.consecutive_wins >= 2 &&
                !userData.hack_mode_enabled
              ) {
                // Force mine on 3rd click
                if (revealedPositions.length === 2) {
                  forceLoss = true;
                  console.log(
                    `Forcing loss for user ${req.user.username} on 3rd click (controlled pattern)`
                  );
                }
              }
            }
          );
        }

        const isMine = forceLoss || minePositions.includes(position);
        revealedPositions.push(position);

        if (isMine) {
          // Game over - hit mine
          db.run(
            'UPDATE games SET revealed_positions = ?, status = ? WHERE id = ?',
            [JSON.stringify(revealedPositions), 'lost', gameId],
            (err) => {
              if (err) {
                return res.status(500).json({ error: 'Database error' });
              }

              // Reset consecutive wins
              if (!req.user.is_admin) {
                db.run('UPDATE users SET consecutive_wins = 0 WHERE id = ?', [
                  userId,
                ]);
              }

              res.json({
                isMine: true,
                gameOver: true,
                revealedPositions,
                minePositions,
                winnings: 0,
              });

              io.emit('gameOver', {
                gameId,
                revealedPositions,
                minePositions,
              });
            }
          );
        } else {
          // Safe position
          const safeCount = revealedPositions.length;
          const totalSafe = 25 - game.mines_count;
          const multiplier = calculateMultiplier(game.mines_count, safeCount);
          const potentialWinnings = game.bet_amount * multiplier;
          const nextMultiplier = calculateMultiplier(
            game.mines_count,
            safeCount + 1
          );

          db.run(
            'UPDATE games SET revealed_positions = ?, multiplier = ? WHERE id = ?',
            [JSON.stringify(revealedPositions), multiplier, gameId],
            (err) => {
              if (err) {
                return res.status(500).json({ error: 'Database error' });
              }

              res.json({
                isMine: false,
                gameOver: false,
                revealedPositions,
                currentMultiplier: multiplier,
                potentialWinnings,
                nextMultiplier:
                  safeCount < totalSafe ? nextMultiplier : multiplier,
              });

              io.emit('multiplierUpdate', {
                gameId,
                currentMultiplier: multiplier,
                potentialWinnings,
                revealedPositions,
                nextMultiplier:
                  safeCount < totalSafe ? nextMultiplier : multiplier,
              });
            }
          );
        }
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Cash out
app.post('/api/game/cashout', authenticateToken, (req, res) => {
  try {
    const { gameId } = req.body;
    const userId = req.user.id;

    db.get(
      'SELECT * FROM games WHERE id = ? AND user_id = ? AND status = ?',
      [gameId, userId, 'active'],
      (err, game) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (!game) {
          return res
            .status(404)
            .json({ error: 'Game not found or not active' });
        }

        const revealedPositions = game.revealed_positions
          ? JSON.parse(game.revealed_positions)
          : [];
        if (revealedPositions.length === 0) {
          return res.status(400).json({ error: 'No positions revealed yet' });
        }

        const winnings = game.bet_amount * game.multiplier;

        // Update game status
        db.run(
          'UPDATE games SET status = ?, winnings = ? WHERE id = ?',
          ['won', winnings, gameId],
          (err) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }

            // Update user balance and stats (skip for admin)
            if (!req.user.is_admin) {
              db.run(
                'UPDATE users SET balance = balance + ?, total_bets = total_bets + ?, consecutive_wins = consecutive_wins + 1 WHERE id = ?',
                [winnings, game.bet_amount, userId]
              );

              // Add transaction record
              db.run(
                'INSERT INTO transactions (user_id, type, amount, status, details) VALUES (?, ?, ?, ?, ?)',
                [
                  userId,
                  'bonus',
                  winnings,
                  'completed',
                  `Game winnings from period ${game.game_period}`,
                ]
              );
            }

            res.json({ winnings });

            io.emit('cashoutSuccess', {
              gameId,
              winnings,
            });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin routes

// Get admin stats
app.get('/api/admin/stats', authenticateToken, requireAdmin, (req, res) => {
  const queries = [
    'SELECT COUNT(*) as total_users FROM users WHERE is_admin = 0',
    'SELECT COUNT(*) as pending_deposits FROM transactions WHERE type = "deposit" AND status = "pending"',
    'SELECT COUNT(*) as pending_withdrawals FROM transactions WHERE type = "withdrawal" AND status = "pending"',
    'SELECT COALESCE(SUM(balance), 0) as total_balance FROM users WHERE is_admin = 0',
  ];

  Promise.all(
    queries.map((query) => {
      return new Promise((resolve, reject) => {
        db.get(query, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
    })
  )
    .then((results) => {
      res.json({
        total_users: results[0].total_users,
        pending_deposits: results[1].pending_deposits,
        pending_withdrawals: results[2].pending_withdrawals,
        total_balance: results[3].total_balance,
      });
    })
    .catch((err) => {
      res.status(500).json({ error: 'Database error' });
    });
});

// Get current period mine positions (for admin panel)
app.get(
  '/api/admin/current-period',
  authenticateToken,
  requireAdmin,
  (req, res) => {
    db.get(
      'SELECT * FROM game_periods WHERE period_id = ?',
      [currentPeriod],
      (err, period) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (!period) {
          return res.status(404).json({ error: 'Current period not found' });
        }

        res.json({
          period_id: period.period_id,
          mine_positions: JSON.parse(period.mine_positions),
          start_time: period.start_time,
        });
      }
    );
  }
);

// Enable/disable hack mode for user
app.post(
  '/api/admin/user/:userId/hack-mode',
  authenticateToken,
  requireAdmin,
  (req, res) => {
    const { userId } = req.params;
    const { enabled } = req.body;

    db.run(
      'UPDATE users SET hack_mode_enabled = ? WHERE id = ?',
      [enabled ? 1 : 0, userId],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        res.json({ success: true, hack_mode_enabled: enabled });
      }
    );
  }
);

// Update user balance
app.post(
  '/api/admin/user/:userId/balance',
  authenticateToken,
  requireAdmin,
  (req, res) => {
    const { userId } = req.params;
    const { balance } = req.body;

    if (typeof balance !== 'number' || balance < 0) {
      return res.status(400).json({ error: 'Invalid balance amount' });
    }

    db.run(
      'UPDATE users SET balance = ? WHERE id = ?',
      [balance, userId],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Add transaction record
        db.run(
          'INSERT INTO transactions (user_id, type, amount, status, details) VALUES (?, ?, ?, ?, ?)',
          [userId, 'bonus', balance, 'completed', 'Admin balance adjustment']
        );

        res.json({ success: true, new_balance: balance });
      }
    );
  }
);

// Get all users (admin)
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  const query = `
    SELECT 
      u.*,
      COALESCE(SUM(CASE WHEN t.type = 'deposit' AND t.status = 'completed' THEN t.amount ELSE 0 END), 0) as total_deposited,
      COALESCE(SUM(CASE WHEN t.type = 'withdrawal' AND t.status = 'approved' THEN t.amount ELSE 0 END), 0) as total_withdrawn,
      COALESCE(SUM(CASE WHEN t.type = 'deposit' AND t.status = 'pending' THEN 1 ELSE 0 END), 0) as pending_deposits,
      COALESCE(SUM(CASE WHEN t.type = 'withdrawal' AND t.status = 'pending' THEN 1 ELSE 0 END), 0) as pending_withdrawals
    FROM users u
    LEFT JOIN transactions t ON u.id = t.user_id
    WHERE u.is_admin = 0
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `;

  db.all(query, (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(users);
  });
});

// Get user details (admin)
app.get(
  '/api/admin/user/:userId',
  authenticateToken,
  requireAdmin,
  (req, res) => {
    const { userId } = req.params;

    const queries = {
      user: 'SELECT * FROM users WHERE id = ?',
      bankDetails: 'SELECT * FROM bank_details WHERE user_id = ?',
      deposits:
        'SELECT * FROM transactions WHERE user_id = ? AND type = "deposit" ORDER BY created_at DESC',
      withdrawals: `
        SELECT t.*, b.bank_name, b.account_number, b.ifsc_code, b.account_holder_name
        FROM transactions t
        LEFT JOIN bank_details b ON t.user_id = b.user_id
        WHERE t.user_id = ? AND t.type = "withdrawal" 
        ORDER BY t.created_at DESC
      `,
      games:
        'SELECT * FROM games WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
    };

    Promise.all([
      new Promise((resolve, reject) => {
        db.get(queries.user, [userId], (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      }),
      new Promise((resolve, reject) => {
        db.get(queries.bankDetails, [userId], (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      }),
      new Promise((resolve, reject) => {
        db.all(queries.deposits, [userId], (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      }),
      new Promise((resolve, reject) => {
        db.all(queries.withdrawals, [userId], (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      }),
      new Promise((resolve, reject) => {
        db.all(queries.games, [userId], (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      }),
    ])
      .then(([user, bankDetails, deposits, withdrawals, games]) => {
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        res.json({
          user,
          bankDetails,
          deposits,
          withdrawals,
          games,
        });
      })
      .catch((err) => {
        res.status(500).json({ error: 'Database error' });
      });
  }
);

// Update user (admin)
app.put(
  '/api/admin/user/:userId',
  authenticateToken,
  requireAdmin,
  (req, res) => {
    const { userId } = req.params;
    const { email, password, bankDetails } = req.body;

    const updates = [];
    const values = [];

    if (email) {
      updates.push('email = ?');
      values.push(email);
    }

    if (password) {
      updates.push('password = ?');
      values.push(bcrypt.hashSync(password, 10));
    }

    if (updates.length > 0) {
      values.push(userId);

      db.run(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function (err) {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          if (this.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
          }

          // Update bank details if provided
          if (bankDetails && bankDetails.bankName) {
            db.run(
              'INSERT OR REPLACE INTO bank_details (user_id, bank_name, account_number, ifsc_code, account_holder_name, is_locked) VALUES (?, ?, ?, ?, ?, ?)',
              [
                userId,
                bankDetails.bankName,
                bankDetails.accountNumber,
                bankDetails.ifscCode,
                bankDetails.accountHolderName,
                1,
              ],
              (err) => {
                if (err) {
                  console.error('Error updating bank details:', err);
                }
                res.json({ success: true });
              }
            );
          } else {
            res.json({ success: true });
          }
        }
      );
    } else {
      res.json({ success: true });
    }
  }
);

// Get deposits (admin)
app.get('/api/admin/deposits', authenticateToken, requireAdmin, (req, res) => {
  const query = `
    SELECT t.*, u.username 
    FROM transactions t
    JOIN users u ON t.user_id = u.id
    WHERE t.type = 'deposit' AND t.status = 'pending'
    ORDER BY t.created_at DESC
  `;

  db.all(query, (err, deposits) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(deposits);
  });
});

// Approve deposit (admin)
app.post(
  '/api/admin/deposits/:depositId/approve',
  authenticateToken,
  requireAdmin,
  (req, res) => {
    const { depositId } = req.params;

    db.get(
      'SELECT * FROM transactions WHERE id = ? AND type = "deposit" AND status = "pending"',
      [depositId],
      (err, deposit) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (!deposit) {
          return res.status(404).json({ error: 'Deposit not found' });
        }

        // Update transaction status
        db.run(
          'UPDATE transactions SET status = "completed" WHERE id = ?',
          [depositId],
          (err) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }

            // Update user balance and deposit status
            db.run(
              'UPDATE users SET balance = balance + ?, initial_deposit_made = 1 WHERE id = ?',
              [deposit.amount, deposit.user_id],
              (err) => {
                if (err) {
                  return res.status(500).json({ error: 'Database error' });
                }

                res.json({ success: true });

                // Emit balance update
                io.emit('balanceUpdate', {
                  userId: deposit.user_id,
                  depositApproved: true,
                  amount: deposit.amount,
                });
              }
            );
          }
        );
      }
    );
  }
);

// Get withdrawals (admin)
app.get(
  '/api/admin/withdrawals',
  authenticateToken,
  requireAdmin,
  (req, res) => {
    const query = `
    SELECT t.*, u.username, b.bank_name, b.account_number, b.ifsc_code, b.account_holder_name
    FROM transactions t
    JOIN users u ON t.user_id = u.id
    LEFT JOIN bank_details b ON t.user_id = b.user_id
    WHERE t.type = 'withdrawal' AND t.status = 'pending'
    ORDER BY t.created_at DESC
  `;

    db.all(query, (err, withdrawals) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(withdrawals);
    });
  }
);

// Approve withdrawal (admin)
app.post(
  '/api/admin/withdrawals/:withdrawalId/approve',
  authenticateToken,
  requireAdmin,
  (req, res) => {
    const { withdrawalId } = req.params;

    db.run(
      'UPDATE transactions SET status = "approved" WHERE id = ? AND type = "withdrawal" AND status = "pending"',
      [withdrawalId],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Withdrawal not found' });
        }

        res.json({ success: true });
      }
    );
  }
);

// Reject withdrawal (admin)
app.post(
  '/api/admin/withdrawals/:withdrawalId/reject',
  authenticateToken,
  requireAdmin,
  (req, res) => {
    const { withdrawalId } = req.params;

    db.get(
      'SELECT * FROM transactions WHERE id = ? AND type = "withdrawal" AND status = "pending"',
      [withdrawalId],
      (err, withdrawal) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (!withdrawal) {
          return res.status(404).json({ error: 'Withdrawal not found' });
        }

        // Update transaction status and refund balance
        db.run(
          'UPDATE transactions SET status = "rejected" WHERE id = ?',
          [withdrawalId],
          (err) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }

            db.run(
              'UPDATE users SET balance = balance + ? WHERE id = ?',
              [withdrawal.amount, withdrawal.user_id],
              (err) => {
                if (err) {
                  return res.status(500).json({ error: 'Database error' });
                }

                res.json({ success: true });
              }
            );
          }
        );
      }
    );
  }
);

// Create deposit
app.post('/api/deposit/create', authenticateToken, (req, res) => {
  const { amount, utrNumber } = req.body;
  const userId = req.user.id;

  if (!amount || amount < 100) {
    return res.status(400).json({ error: 'Minimum deposit amount is ₹100' });
  }

  if (!utrNumber || utrNumber.length !== 12) {
    return res
      .status(400)
      .json({ error: 'UTR number must be exactly 12 digits' });
  }

  db.run(
    'INSERT INTO transactions (user_id, type, amount, status, utr_number, details) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, 'deposit', amount, 'pending', utrNumber, 'UPI deposit'],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({ success: true, transactionId: this.lastID });
    }
  );
});

// Create withdrawal
app.post('/api/withdraw/create', authenticateToken, (req, res) => {
  const { amount, bankName, accountNumber, ifscCode, accountHolderName } =
    req.body;
  const userId = req.user.id;

  if (!amount || amount < 100 || amount % 50 !== 0) {
    return res.status(400).json({ error: 'Invalid withdrawal amount' });
  }

  // Check user eligibility
  db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user.initial_deposit_made) {
      return res.status(400).json({ error: 'Initial deposit required' });
    }

    if (user.total_bets < user.required_bet_amount) {
      return res.status(400).json({ error: 'Minimum bet requirement not met' });
    }

    if (user.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Deduct amount from balance
    db.run(
      'UPDATE users SET balance = balance - ? WHERE id = ?',
      [amount, userId],
      (err) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        // Save/update bank details
        db.run(
          'INSERT OR REPLACE INTO bank_details (user_id, bank_name, account_number, ifsc_code, account_holder_name, is_locked) VALUES (?, ?, ?, ?, ?, ?)',
          [userId, bankName, accountNumber, ifscCode, accountHolderName, 1],
          (err) => {
            if (err) {
              console.error('Error saving bank details:', err);
            }

            // Create withdrawal transaction
            db.run(
              'INSERT INTO transactions (user_id, type, amount, status, details) VALUES (?, ?, ?, ?, ?)',
              [
                userId,
                'withdrawal',
                amount,
                'pending',
                JSON.stringify({
                  bankName,
                  accountNumber,
                  ifscCode,
                  accountHolderName,
                }),
              ],
              function (err) {
                if (err) {
                  return res.status(500).json({ error: 'Database error' });
                }

                res.json({
                  success: true,
                  transactionId: this.lastID,
                  bankLocked: true,
                });
              }
            );
          }
        );
      }
    );
  });
});

// Get transactions
app.get('/api/transactions', authenticateToken, (req, res) => {
  const { type } = req.query;
  const userId = req.user.id;

  let query = 'SELECT * FROM transactions WHERE user_id = ?';
  let params = [userId];

  if (type && type !== 'all') {
    query += ' AND type = ?';
    params.push(type);
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, transactions) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(transactions);
  });
});

// Get game history
app.get('/api/games/history', authenticateToken, (req, res) => {
  const { limit } = req.query;
  const userId = req.user.id;

  let query = 'SELECT * FROM games WHERE user_id = ? ORDER BY created_at DESC';
  let params = [userId];

  if (limit) {
    query += ' LIMIT ?';
    params.push(parseInt(limit));
  }

  db.all(query, params, (err, games) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(games);
  });
});

// Helper functions
function getBaseMultiplier(minesCount) {
  const multipliers = {
    1: 1.01,
    2: 1.05,
    3: 1.08,
    4: 1.1,
    5: 1.15,
    6: 1.21,
    7: 1.27,
    8: 1.34,
    9: 1.42,
    10: 1.51,
    11: 1.61,
    12: 1.73,
    13: 1.86,
    14: 2.02,
    15: 2.2,
    16: 2.4,
    17: 2.63,
    18: 2.89,
    19: 3.19,
    20: 3.54,
    21: 3.95,
    22: 4.44,
    23: 5.02,
    24: 5.74,
  };
  return multipliers[minesCount] || 1.08;
}

function calculateMultiplier(minesCount, safeRevealed) {
  const totalCells = 25;
  const safeCells = totalCells - minesCount;

  if (safeRevealed === 0) return 1.0;

  let multiplier = 1.0;
  for (let i = 1; i <= safeRevealed; i++) {
    const remainingSafe = safeCells - i + 1;
    const remainingTotal = totalCells - i + 1;
    multiplier *= remainingTotal / remainingSafe;
  }

  return Math.max(1.01, multiplier);
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Authenticate socket connection
  socket.on('authenticate', (token) => {
    try {
      const decoded = jwt.verify(token, 'your-secret-key');
      socket.userId = decoded.id;
      socket.isAdmin = decoded.is_admin;

      // Send current period info
      socket.emit('periodUpdate', {
        currentPeriod,
        nextPeriod,
        timeRemaining: 60000 - (Date.now() - periodStartTime),
        startTime: periodStartTime,
      });

      // Send current mine positions to admin only
      if (socket.isAdmin) {
        db.get(
          'SELECT mine_positions FROM game_periods WHERE period_id = ?',
          [currentPeriod],
          (err, period) => {
            if (!err && period) {
              socket.emit('currentMinePositions', {
                period: currentPeriod,
                positions: JSON.parse(period.mine_positions),
              });
            }
          }
        );
      }
    } catch (error) {
      socket.emit('authError', 'Invalid token');
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Initialize and start server
async function startServer() {
  try {
    await initializeDatabase();
    await createTables();

    console.log('Database schema created successfully!');

    // Initialize game periods
    initializeGamePeriods();

    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`🚀 MineX Server running on port ${PORT}`);
      console.log('📡 WebSocket server ready for real-time updates');
      console.log('🎮 Game periods initialized');
      console.log('👤 Default admin user: username=admin, password=admin123');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  if (periodTimer) {
    clearInterval(periodTimer);
  }
  if (db) {
    db.close();
  }
  process.exit(0);
});

startServer();