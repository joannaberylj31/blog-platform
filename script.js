const API_URL = "http://localhost:5000/api";

let currentUser =
    JSON.parse(localStorage.getItem("currentUser")) || null;

let token =
    localStorage.getItem("token") || null;


/* ================= SHOW SECTION ================= */

function showSection(sectionId) {

    document.querySelectorAll(".section").forEach(section => {
        section.classList.remove("active");
    });

    const section =
        document.getElementById(sectionId);

    if (section) {
        section.classList.add("active");
    }
}


/* ================= REGISTER ================= */

async function register() {

    const name =
        document.getElementById("registerName").value.trim();

    const email =
        document.getElementById("registerEmail").value.trim();

    const password =
        document.getElementById("registerPassword").value.trim();

    if (!name || !email || !password) {
        alert("Please fill all fields");
        return;
    }

    try {

        const response = await fetch(
            `${API_URL}/register`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name,
                    email,
                    password
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {

            alert(data.message || "Registration failed");

            return;
        }

        alert("Registration successful! ❤️");

        document.getElementById("registerName").value = "";
        document.getElementById("registerEmail").value = "";
        document.getElementById("registerPassword").value = "";

        showSection("login");

    } catch (error) {

        console.error(error);

        alert("Cannot connect to server");
    }
}


/* ================= LOGIN ================= */

async function login() {

    const email =
        document.getElementById("loginEmail").value.trim();

    const password =
        document.getElementById("loginPassword").value.trim();

    if (!email || !password) {

        alert("Please enter email and password");

        return;
    }

    try {

        const response = await fetch(
            `${API_URL}/login`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email,
                    password
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {

            alert(data.message || "Login failed");

            return;
        }

        token = data.token;
        currentUser = data.user;

        localStorage.setItem("token", token);

        localStorage.setItem(
            "currentUser",
            JSON.stringify(currentUser)
        );

        alert("Login successful! ❤️");

        updateNavbar();

        showSection("home");

        loadPosts();

    } catch (error) {

        console.error(error);

        alert("Cannot connect to server");
    }
}


/* ================= LOGOUT ================= */

function logout() {

    localStorage.removeItem("token");
    localStorage.removeItem("currentUser");

    token = null;
    currentUser = null;

    updateNavbar();

    showSection("home");

    alert("Logged out successfully");
}


/* ================= NAVBAR ================= */

function updateNavbar() {

    const loginBtn =
        document.getElementById("loginNav");

    const registerBtn =
        document.getElementById("registerNav");

    const createBtn =
        document.getElementById("createNav");

    const logoutBtn =
        document.getElementById("logoutNav");

    if (!loginBtn) return;

    if (currentUser && token) {

        loginBtn.style.display = "none";
        registerBtn.style.display = "none";
        createBtn.style.display = "inline-block";
        logoutBtn.style.display = "inline-block";

    } else {

        loginBtn.style.display = "inline-block";
        registerBtn.style.display = "inline-block";
        createBtn.style.display = "none";
        logoutBtn.style.display = "none";
    }
}


/* ================= LOAD POSTS ================= */

async function loadPosts() {

    const postsContainer =
        document.getElementById("posts");

    if (!postsContainer) return;

    try {

        const response = await fetch(
            `${API_URL}/posts`
        );

        const posts = await response.json();

        postsContainer.innerHTML = "";

        if (posts.length === 0) {

            postsContainer.innerHTML =
                "<p>No posts yet. Create the first post! 💗";

            return;
        }

        posts.forEach(post => {

            const div =
                document.createElement("div");

            div.className = "post-card";

            let buttons = "";

            if (
                currentUser &&
                currentUser.id == post.user_id
            ) {

                buttons = `
                    <button
                        onclick="editPost(${post.id}, '${escapeText(post.title)}', '${escapeText(post.content)}')">
                        Edit ✏️
                    </button>

                    <button
                        onclick="deletePost(${post.id})">
                        Delete 🗑️
                    </button>
                `;
            }

            div.innerHTML = `

                <h2>${post.title}</h2>

                <p>${post.content}</p>

                <small>
                    By ${post.username}
                </small>

                <br><br>

                <button onclick="viewPost(${post.id})">
                    Read & Comment 💬
                </button>

                ${buttons}

            `;

            postsContainer.appendChild(div);
        });

    } catch (error) {

        console.error("LOAD POSTS ERROR:", error);
    }
}


/* ================= ESCAPE TEXT ================= */

function escapeText(text) {

    return text
        .replace(/'/g, "\\'")
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "");
}


/* ================= CREATE POST ================= */

async function createPost() {

    if (!token) {

        alert("Please login first");

        showSection("login");

        return;
    }

    const title =
        document.getElementById("postTitle").value.trim();

    const content =
        document.getElementById("postContent").value.trim();

    if (!title || !content) {

        alert("Please fill title and content");

        return;
    }

    try {

        const response = await fetch(
            `${API_URL}/posts`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                },

                body: JSON.stringify({
                    title,
                    content
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {

            alert(data.message || "Could not create post");

            return;
        }

        alert("Post created successfully! 💗");

        document.getElementById("postTitle").value = "";
        document.getElementById("postContent").value = "";

        showSection("home");

        loadPosts();

    } catch (error) {

        console.error(error);

        alert("Cannot connect to server");
    }
}


/* ================= EDIT POST ================= */

async function editPost(id, oldTitle, oldContent) {

    const newTitle =
        prompt("Enter new title:", oldTitle);

    if (newTitle === null) return;

    const newContent =
        prompt("Enter new content:", oldContent);

    if (newContent === null) return;

    if (!newTitle.trim() || !newContent.trim()) {

        alert("Title and content cannot be empty");

        return;
    }

    try {

        const response = await fetch(
            `${API_URL}/posts/${id}`,
            {
                method: "PUT",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                },

                body: JSON.stringify({
                    title: newTitle,
                    content: newContent
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {

            alert(data.message || "Could not edit post");

            return;
        }

        alert("Post updated successfully! ✏️");

        loadPosts();

    } catch (error) {

        console.error(error);

        alert("Cannot connect to server");
    }
}


/* ================= DELETE POST ================= */

async function deletePost(id) {

    const confirmDelete =
        confirm("Are you sure you want to delete this post?");

    if (!confirmDelete) return;

    try {

        const response = await fetch(
            `${API_URL}/posts/${id}`,
            {
                method: "DELETE",

                headers: {
                    "Authorization": "Bearer " + token
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {

            alert(data.message || "Could not delete post");

            return;
        }

        alert("Post deleted successfully! 🗑️");

        loadPosts();

    } catch (error) {

        console.error(error);

        alert("Cannot connect to server");
    }
}


/* ================= VIEW POST ================= */

async function viewPost(postId) {

    try {

        const response = await fetch(
            `${API_URL}/posts`
        );

        const posts = await response.json();

        const post =
            posts.find(p => p.id == postId);

        if (!post) {

            alert("Post not found");

            return;
        }

        const container =
            document.getElementById("singlePost");

        container.innerHTML = `

            <div class="post-card">

                <h1>${post.title}</h1>

                <p>${post.content}</p>

                <small>
                    By ${post.username}
                </small>

                <hr>

                <h3>Comments 💬</h3>

                <div id="comments"></div>

                ${
                    currentUser
                    ?
                    `
                    <textarea
                        id="commentText"
                        placeholder="Write a comment..."
                    ></textarea>

                    <button
                        onclick="addComment(${post.id})">
                        Add Comment 💗
                    </button>
                    `
                    :
                    `
                    <p>Please login to comment.</p>
                    `
                }

            </div>
        `;

        showSection("singlePost");

        loadComments(postId);

    } catch (error) {

        console.error(error);

        alert("Could not open post");
    }
}


/* ================= LOAD COMMENTS ================= */

async function loadComments(postId) {

    try {

        const response = await fetch(
            `${API_URL}/posts/${postId}/comments`
        );

        const comments = await response.json();

        const container =
            document.getElementById("comments");

        container.innerHTML = "";

        if (comments.length === 0) {

            container.innerHTML =
                "<p>No comments yet.</p>";

            return;
        }

        comments.forEach(comment => {

            const div =
                document.createElement("div");

            div.className = "comment";

            div.innerHTML = `
                <strong>${comment.username}</strong>
                <p>${comment.content}</p>
            `;

            container.appendChild(div);
        });

    } catch (error) {

        console.error(error);
    }
}


/* ================= ADD COMMENT ================= */

async function addComment(postId) {

    if (!token) {

        alert("Please login first");

        return;
    }

    const content =
        document.getElementById("commentText").value.trim();

    if (!content) {

        alert("Please write a comment");

        return;
    }

    try {

        const response = await fetch(
            `${API_URL}/posts/${postId}/comments`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                },

                body: JSON.stringify({
                    content
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {

            alert(data.message || "Could not add comment");

            return;
        }

        document.getElementById("commentText").value = "";

        loadComments(postId);

    } catch (error) {

        console.error(error);

        alert("Cannot connect to server");
    }
}


/* ================= START ================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        updateNavbar();

        showSection("home");

        loadPosts();

    }
);