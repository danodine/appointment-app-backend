# Appointment App Backend

This repository contains the backend code for the **Appointment App**, a web-based platform designed to facilitate scheduling and managing appointments between users and service providers. Built with **Node.js**, **Express.js**, and **MongoDB**, it provides a scalable and robust RESTful API.

---

## Features

* ✅ **User Authentication**: Secure registration and login using JWT tokens.
* 📅 **Appointment Management**: Create, read, update, and delete appointments.
* 👤 **User Profiles**: Manage user information and profile images.
* 🔐 **Role-Based Access Control**: Access differentiation between regular users and administrators.
* 🚨 **Error Handling**: Detailed error responses for all API endpoints.
* 📝 **Logging**: Middleware for comprehensive request logging and error tracking.

---

## Technologies Used

| Technology         | Description            |
| ------------------ | ---------------------- |
| **Runtime**        | Node.js                |
| **Framework**      | Express.js             |
| **Database**       | MongoDB (Mongoose ODM) |
| **Authentication** | JSON Web Tokens (JWT)  |
| **File Uploads**   | Multer                 |
| **Environment**    | dotenv                 |
| **Linting**        | ESLint                 |
| **Formatting**     | Prettier               |

---

## Getting Started

### Prerequisites

Ensure you have installed:

* [Node.js](https://nodejs.org/) (v14+)
* [MongoDB](https://www.mongodb.com/) (local/cloud)

### Installation

Clone the repo and install dependencies:

```bash
git clone https://github.com/danodine/appointment-app-backend.git
cd appointment-app-backend
npm install
```

### Environment Variables

Create a `.env` file with:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

### Run the Server

```bash
npm start
```

Server starts at: `http://localhost:5000`

---

## API Endpoints

### Authentication

* **POST** `/api/auth/register` – Register new user
* **POST** `/api/auth/login` – Authenticate user

### Users

* **GET** `/api/users` – Get all users *(Admin)*
* **GET** `/api/users/:id` – Get user details
* **PUT** `/api/users/:id` – Update user
* **DELETE** `/api/users/:id` – Delete user *(Admin)*

### Appointments

* **GET** `/api/appointments` – Get user appointments
* **POST** `/api/appointments` – Create appointment
* **GET** `/api/appointments/:id` – Get specific appointment
* **PUT** `/api/appointments/:id` – Update appointment
* **DELETE** `/api/appointments/:id` – Delete appointment

---

## Project Structure

```
appointment-app-backend/
├── controllers/        # Route handlers
├── models/             # Database schemas
├── routes/             # API routes
├── utils/              # Utilities and middleware
├── public/             # Static files (images)
├── app.js              # App configuration
├── server.js           # Entry point
├── .env                # Environment variables
├── .gitignore          # Git ignore configuration
├── package.json        # Project dependencies and scripts
└── README.md           # Project documentation
```

---

## Contributing

Contributions are welcome! To contribute:

1. Fork this repository.
2. Create your branch (`git checkout -b feature/your-feature-name`).
3. Commit changes (`git commit -m 'Add your feature'`).
4. Push your branch (`git push origin feature/your-feature-name`).
5. Open a Pull Request.

---

## License

This project is licensed under the [MIT License](LICENSE.md).
