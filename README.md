# House Hunting Backend

A comprehensive Node.js/Express backend API for a house hunting platform with three user roles: Admin, Property Manager, and Customer.

## Features

### User Roles
- **Admin**: Full system access, user management
- **Property Manager**: Create, update, and manage properties
- **Customer**: Browse properties, book visits

### Core Functionality
- User authentication with JWT
- Property listing and management
- Booking/visit scheduling system
- Role-based access control
- Property search and filtering

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4 or higher)
- Yarn package manager

## Installation

1. Clone the repository or create project structure:
```bash
mkdir house-hunting-backend
cd house-hunting-backend
```

2. Install dependencies:
```bash
yarn install
```

3. Create `.env` file in root directory with the following variables:
```bash
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/house-hunting
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
```

4. Make sure MongoDB is running on your system

## Running the Application

### Development Mode
```bash
yarn dev
```

### Production Mode
```bash
yarn start
```

### Seed Admin User
```bash
yarn seed
```

Default admin credentials after seeding:
- Email: `admin@househunting.com`
- Password: `admin123`

**Important**: Change the admin password immediately after first login!

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (customer or property_manager)
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile (Protected)

### Properties
- `GET /api/properties` - Get all properties (with filters)
- `POST /api/properties` - Create property (Admin/Property Manager)
- `GET /api/properties/:id` - Get single property
- `PUT /api/properties/:id` - Update property (Admin/Property Manager)
- `DELETE /api/properties/:id` - Delete property (Admin/Property Manager)

### Bookings
- `GET /api/bookings` - Get all bookings (role-based)
- `POST /api/bookings` - Create booking (Customer)
- `GET /api/bookings/:id` - Get single booking
- `PUT /api/bookings/:id` - Update booking status

### Users (Admin Only)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get single user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `PUT /api/users/:id/toggle-status` - Toggle user active status

## Request Examples

### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "role": "customer"
}
```

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### Create Property
```bash
POST /api/properties
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "title": "Beautiful 3BR Apartment",
  "description": "Spacious apartment in the city center",
  "propertyType": "apartment",
  "price": 250000,
  "bedrooms": 3,
  "bathrooms": 2,
  "area": 1200,
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "country": "USA",
    "zipCode": "10001"
  },
  "amenities": ["parking", "gym", "pool"],
  "isPublished": true
}
```

### Create Booking
```bash
POST /api/bookings
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "property": "PROPERTY_ID",
  "visitDate": "2025-10-15",
  "visitTime": "14:00",
  "notes": "Interested in viewing the property"
}
```

## Query Parameters

### Get Properties
```bash
GET /api/properties?city=Nairobi&propertyType=apartment&minPrice=100000&maxPrice=500000&bedrooms=3&status=available
```

## Project Structure

```
house-hunting-backend/
├── src/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── propertyController.js
│   │   ├── bookingController.js
│   │   └── userController.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Property.js
│   │   └── Booking.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── properties.js
│   │   ├── bookings.js
│   │   └── users.js
│   ├── utils/
│   │   └── seedAdmin.js
│   ├── uploads/
│   ├── app.js
│   └── server.js
├── .env
├── .gitignore
├── package.json
└── README.md
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "count": 10
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message here"
}
```

## Security Features

- Password hashing with bcrypt
- JWT authentication
- Role-based authorization
- Input validation
- Protected routes
- CORS enabled

## Database Models

### User
- name, email, password (hashed)
- role (admin, property_manager, customer)
- phone, isActive, createdAt

### Property
- title, description, propertyType
- status, price, bedrooms, bathrooms, area
- address (street, city, state, country, zipCode, coordinates)
- amenities, images
- propertyManager (ref: User)
- isPublished, createdAt, updatedAt

### Booking
- property (ref: Property)
- customer (ref: User)
- visitDate, visitTime
- status (pending, confirmed, cancelled, completed)
- notes, createdAt

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT

## Support

For support, email support@househunting.com