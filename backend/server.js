const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {

    if (err) {
        console.log("❌ MySQL connection failed:");
        console.log(err);
        return;
    }

    console.log("✅ MySQL connected successfully!");

    createTables();
});


function createTables() {

    const usersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL
        )
    `;

    db.query(usersTable, (err) => {

        if (err) {
            console.log("USERS TABLE ERROR:", err);
            return;
        }

        console.log("✅ Users table ready");

        const postsTable = `
            CREATE TABLE IF NOT EXISTS posts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                content TEXT NOT NULL,
                user_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id)
                REFERENCES users(id)
                ON DELETE CASCADE
            )
        `;

        db.query(postsTable, (err) => {

            if (err) {
                console.log("POSTS TABLE ERROR:", err);
                return;
            }

            console.log("✅ Posts table ready");

            const commentsTable = `
                CREATE TABLE IF NOT EXISTS comments (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    content TEXT NOT NULL,
                    user_id INT NOT NULL,
                    post_id INT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id)
                    REFERENCES users(id)
                    ON DELETE CASCADE,
                    FOREIGN KEY (post_id)
                    REFERENCES posts(id)
                    ON DELETE CASCADE
                )
            `;

            db.query(commentsTable, (err) => {

                if (err) {
                    console.log("COMMENTS TABLE ERROR:", err);
                    return;
                }

                console.log("✅ Comments table ready");
                console.log("🎉 Database setup complete!");
            });
        });
    });
}


/* ================= HOME ================= */

app.get("/", (req, res) => {

    res.json({
        message: "Blog Platform Backend is Running ❤️"
    });
});


/* ================= REGISTER ================= */

app.post("/api/register", (req, res) => {

    console.log("REGISTER REQUEST RECEIVED");

    const { name, email, password } = req.body;

    if (!name || !email || !password) {

        return res.status(400).json({
            message: "Please fill all fields"
        });
    }

    const checkSql =
        "SELECT id FROM users WHERE email = ?";

    db.query(checkSql, [email], (err, result) => {

        if (err) {

            console.log("REGISTER CHECK ERROR:", err);

            return res.status(500).json({
                message: "Database error"
            });
        }

        if (result.length > 0) {

            return res.status(400).json({
                message: "Email already registered"
            });
        }

        const hashedPassword =
            bcrypt.hashSync(password, 10);

        const insertSql = `
            INSERT INTO users
            (username, email, password)
            VALUES (?, ?, ?)
        `;

        db.query(
            insertSql,
            [name, email, hashedPassword],
            (err, result) => {

                if (err) {

                    console.log("REGISTER INSERT ERROR:", err);

                    return res.status(500).json({
                        message: "Registration failed"
                    });
                }

                console.log("USER CREATED:", result.insertId);

                res.status(201).json({
                    message: "Registration successful"
                });
            }
        );
    });
});


/* ================= LOGIN ================= */

app.post("/api/login", (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {

        return res.status(400).json({
            message: "Please enter email and password"
        });
    }

    const sql =
        "SELECT * FROM users WHERE email = ?";

    db.query(sql, [email], (err, result) => {

        if (err) {

            console.log("LOGIN ERROR:", err);

            return res.status(500).json({
                message: "Database error"
            });
        }

        if (result.length === 0) {

            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = result[0];

        const validPassword =
            bcrypt.compareSync(
                password,
                user.password
            );

        if (!validPassword) {

            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        res.json({
            message: "Login successful",
            token: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    });
});


/* ================= AUTH ================= */

function authenticateToken(req, res, next) {

    const authHeader =
        req.headers.authorization;

    if (!authHeader) {

        return res.status(401).json({
            message: "Please login first"
        });
    }

    const token =
        authHeader.split(" ")[1];

    try {

        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );

        req.user = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
}


/* ================= GET POSTS ================= */

app.get("/api/posts", (req, res) => {

    const sql = `
        SELECT
            posts.id,
            posts.title,
            posts.content,
            posts.user_id,
            posts.created_at,
            users.username
        FROM posts
        INNER JOIN users
        ON posts.user_id = users.id
        ORDER BY posts.created_at DESC
    `;

    db.query(sql, (err, result) => {

        if (err) {

            console.log("GET POSTS ERROR:", err);

            return res.status(500).json({
                message: "Could not load posts"
            });
        }

        res.json(result);
    });
});


/* ================= CREATE POST ================= */

app.post("/api/posts", authenticateToken, (req, res) => {

    const { title, content } = req.body;

    if (!title || !content) {

        return res.status(400).json({
            message: "Title and content are required"
        });
    }

    const sql = `
        INSERT INTO posts
        (title, content, user_id)
        VALUES (?, ?, ?)
    `;

    db.query(
        sql,
        [title, content, req.user.id],
        (err, result) => {

            if (err) {

                console.log("CREATE POST ERROR:", err);

                return res.status(500).json({
                    message: "Could not create post"
                });
            }

            res.status(201).json({
                message: "Post created successfully",
                id: result.insertId
            });
        }
    );
});


/* ================= EDIT POST ================= */

app.put("/api/posts/:id", authenticateToken, (req, res) => {

    const { title, content } = req.body;

    if (!title || !content) {

        return res.status(400).json({
            message: "Title and content are required"
        });
    }

    const sql = `
        UPDATE posts
        SET title = ?, content = ?
        WHERE id = ? AND user_id = ?
    `;

    db.query(
        sql,
        [
            title,
            content,
            req.params.id,
            req.user.id
        ],
        (err, result) => {

            if (err) {

                console.log("EDIT POST ERROR:", err);

                return res.status(500).json({
                    message: "Could not edit post"
                });
            }

            if (result.affectedRows === 0) {

                return res.status(403).json({
                    message: "You can only edit your own post"
                });
            }

            res.json({
                message: "Post updated successfully"
            });
        }
    );
});


/* ================= DELETE POST ================= */

app.delete("/api/posts/:id", authenticateToken, (req, res) => {

    const sql = `
        DELETE FROM posts
        WHERE id = ? AND user_id = ?
    `;

    db.query(
        sql,
        [
            req.params.id,
            req.user.id
        ],
        (err, result) => {

            if (err) {

                console.log("DELETE POST ERROR:", err);

                return res.status(500).json({
                    message: "Could not delete post"
                });
            }

            if (result.affectedRows === 0) {

                return res.status(403).json({
                    message: "You can only delete your own post"
                });
            }

            res.json({
                message: "Post deleted successfully"
            });
        }
    );
});


/* ================= GET COMMENTS ================= */

app.get("/api/posts/:id/comments", (req, res) => {

    const sql = `
        SELECT
            comments.id,
            comments.content,
            comments.created_at,
            users.username
        FROM comments
        INNER JOIN users
        ON comments.user_id = users.id
        WHERE comments.post_id = ?
        ORDER BY comments.created_at ASC
    `;

    db.query(
        sql,
        [req.params.id],
        (err, result) => {

            if (err) {

                console.log("GET COMMENTS ERROR:", err);

                return res.status(500).json({
                    message: "Could not load comments"
                });
            }

            res.json(result);
        }
    );
});


/* ================= ADD COMMENT ================= */

app.post(
    "/api/posts/:id/comments",
    authenticateToken,
    (req, res) => {

        const { content } = req.body;

        if (!content) {

            return res.status(400).json({
                message: "Comment cannot be empty"
            });
        }

        const sql = `
            INSERT INTO comments
            (content, user_id, post_id)
            VALUES (?, ?, ?)
        `;

        db.query(
            sql,
            [
                content,
                req.user.id,
                req.params.id
            ],
            (err, result) => {

                if (err) {

                    console.log("ADD COMMENT ERROR:", err);

                    return res.status(500).json({
                        message: "Could not add comment"
                    });
                }

                res.status(201).json({
                    message: "Comment added",
                    id: result.insertId
                });
            }
        );
    }
);


/* ================= SERVER ================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {

    console.log(
        `🚀 Blog Platform server running on http://localhost:${PORT}`
    );

});