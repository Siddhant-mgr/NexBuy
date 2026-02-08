# NexBuy - Hyperlocal E-commerce Platform

NexBuy is a hyperlocal, location-based e-commerce platform designed to connect customers with nearby stores in real time.

## Features (Current Implementation)

- ✅ User Registration
- ✅ User Login
- ✅ JWT Authentication
- ✅ Role-based accounts (Customer/Seller)

## Tech Stack

- **Frontend**: React.js, HTML, CSS, JavaScript
- **Backend**: Node.js (Express.js)
- **Database**: MongoDB
- **Authentication**: JWT

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

## Installation

1. Clone the repository:
```bash
cd NexBuy
```

2. Install all dependencies:
```bash
npm run install-all
```

Or install separately:
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

3. Set up environment variables:

Create a `.env` file in the `server` directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/nexbuy
JWT_SECRET=your_jwt_secret_key_here
CLIENT_URL=http://localhost:3000
```

Create a `.env` file in the `client` directory:
```env
REACT_APP_API_URL=http://localhost:5005
```

4. Start MongoDB:
   - If using local MongoDB, make sure MongoDB is running on your system
   - If using MongoDB Atlas, update the `MONGODB_URI` in `.env`

## Running the Application

### Development Mode (Runs both server and client)

From the root directory:
```bash
npm run dev
```

### Run Separately

**Backend Server:**
```bash
cd server
npm run dev
```
Server will run on `http://localhost:5000` (if 5000 is in use, it will try the next available port)

**Frontend Client:**
```bash
cd client
npm start
```
Client will run on `http://localhost:3000`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "customer",
    "phone": "1234567890",
    "address": "123 Main St"
  }
  ```

- `POST /api/auth/login` - Login user
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```

## Project Structure

```
NexBuy/
├── server/
│   ├── models/
│   │   ├── User.js
│   │   ├── Store.js
│   │   └── Product.js
│   ├── routes/
│   │   └── auth.js
│   ├── middleware/
│   │   └── auth.js
│   ├── index.js
│   └── package.json
├── client/
│   ├── public/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   └── Auth.css
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── utils/
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
└── package.json
```

## Usage

1. Start the application using `npm run dev`
2. Open `http://localhost:3000` in your browser
3. Register a new account or login with existing credentials
4. Choose your role (Customer or Seller) during registration

## Future Features

- Location-based shop & product discovery
- Real-time stock status
- Item reservation system
- Quick bargain chat
- Seller dashboard
- GPS navigation integration
- Reputation/trust score system

## License

ISC

