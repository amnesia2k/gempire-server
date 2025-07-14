# Gempire API: Robust E-commerce Backend 💎

This project delivers a high-performance, scalable backend solution for a modern e-commerce platform. Built with TypeScript, it provides a comprehensive set of APIs for managing products, categories, and customer orders, alongside a secure admin dashboard. The architecture prioritizes efficiency and maintainability, leveraging cutting-edge technologies to ensure a smooth and responsive experience.

## 🚀 Getting Started

Follow these steps to set up the Gempire API server on your local machine.

### Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js**: Version 20.x or higher
*   **pnpm**: Recommended package manager (`npm install -g pnpm`)
*   **PostgreSQL**: A running instance of PostgreSQL
*   **Redis**: A running Redis instance

### Installation

1.  **Clone the Repository**

    ```bash
    git clone https://github.com/amnesia2k/gempire-server.git
    cd gempire-server
    ```

2.  **Install Dependencies**

    ```bash
    pnpm install
    ```

3.  **Configure Environment Variables**

    Create a `.env` file in the root directory of the project based on the `.env.production` example. You'll need to fill in your database and Cloudinary credentials.

    ```
    # Database Connection
    DATABASE_URL="postgresql://user:password@host:port/database_name"

    # JWT Secret for Admin Authentication
    JWT_SECRET="your_very_strong_jwt_secret"

    # Cloudinary Credentials for Image Storage
    CLOUDINARY_CLOUD_NAME="your_cloudinary_cloud_name"
    CLOUDINARY_API_KEY="your_cloudinary_api_key"
    CLOUDINARY_API_SECRET="your_cloudinary_api_secret"

    # Redis URL (optional, defaults to local if not provided)
    REDIS_URL="redis://your_redis_host:port"
    ```

4.  **Database Setup**

    This project uses Drizzle ORM for database interactions and migrations.

    *   **Push Schema to Database (Initial Setup)**
        ```bash
        pnpm run db:push
        ```
    *   **Generate New Migrations (After Schema Changes)**
        ```bash
        pnpm run db:generate
        ```
    *   **Apply Migrations**
        ```bash
        pnpm run db:migrate
        ```
    *   **Open Drizzle Studio (for database inspection)**
        ```bash
        pnpm run db:studio
        ```

### Running the Project

*   **For Development (with hot-reloading)**
    ```bash
    pnpm run dev
    ```
    The server will typically run on `http://localhost:8000`.

*   **For Production**
    ```bash
    pnpm run build
    pnpm start
    ```

## 🎯 Usage

The Gempire API serves as the backbone for an e-commerce application, providing endpoints for managing product catalogs, processing orders, and authenticating administrators.

### API Endpoints

Once the server is running, you can interact with the API. All endpoints are prefixed with `/api/v1`.

*   **Product Management**
    *   `POST /api/v1/product`: Create a new product (requires image files).
    *   `GET /api/v1/products`: Retrieve all products with associated images and categories.
    *   `GET /api/v1/product/:slug`: Fetch a single product by its URL-friendly slug.
    *   `PATCH /api/v1/product/:slug`: Update product details and images.
    *   `DELETE /api/v1/product/:id`: Remove a product and its images.

*   **Category Management**
    *   `POST /api/v1/category`: Create a new product category.
    *   `GET /api/v1/categories`: List all available categories.
    *   `GET /api/v1/category/:slug`: Get products within a specific category (paginated). Special slug `all` retrieves all products.

*   **Order Processing**
    *   `POST /api/v1/order`: Create a new customer order.
    *   `GET /api/v1/orders`: Retrieve a list of all orders (admin access).
    *   `GET /api/v1/order/:id`: Fetch details for a specific order.
    *   `PATCH /api/v1/order/:id/status`: Update the status of an order.

*   **Admin Dashboard Access**
    *   `POST /api/v1/login`: Authenticate an administrator with a passcode. Sets a secure cookie.
    *   `POST /api/v1/logout`: Invalidate the admin session.
    *   `GET /api/v1/admin`: Retrieve current admin details (requires authentication cookie).

### Example Workflow: Creating a Product

To create a product, you would typically send a `POST` request to `/api/v1/product` with `multipart/form-data`.

```bash
curl -X POST \
  http://localhost:8000/api/v1/product \
  -H 'Content-Type: multipart/form-data' \
  -F 'name=Sparkling Diamond Ring' \
  -F 'description=A beautiful ring with a dazzling diamond.' \
  -F 'price=1200.00' \
  -F 'unit=1' \
  -F 'categoryId=clv84r000000008ld2g6m7k02' \
  -F 'files=@/path/to/your/image1.jpg' \
  -F 'files=@/path/to/your/image2.png'
```

Replace `/path/to/your/image.jpg` with the actual path to your image files and `categoryId` with a valid category ID from your database.

## ✨ Key Features

*   **Product & Category Management**: Robust CRUD operations for products and categories, including automatic slug generation for SEO-friendly URLs.
*   **Order System**: Comprehensive order creation, retrieval, and status updates, including detailed order item tracking.
*   **Admin Authentication**: Secure passcode-based login for dashboard access, utilizing JWT for session management and cookies for persistence.
*   **Database Integration**: Leverages Drizzle ORM with PostgreSQL for type-safe, efficient, and reliable data persistence, including robust migration management.
*   **Redis Caching**: Implements aggressive caching strategies with Redis to significantly reduce database load and improve API response times for frequently accessed data.
*   **Cloudinary Integration**: Seamlessly handles image uploads, resizing, optimization (to WebP), and deletion via Cloudinary, ensuring fast and efficient media delivery.
*   **Rate Limiting**: Protects API endpoints from abuse and brute-force attacks using `express-rate-limit` with a Redis store.
*   **Centralized Error Handling**: Custom `AppError` class and middleware for consistent and clear error responses across the API.
*   **Modular Architecture**: Organized codebase with clear separation of concerns (controllers, services, utilities, schemas) for enhanced maintainability and scalability.
*   **TypeScript**: Fully typed codebase, boosting code quality, readability, and reducing runtime errors.

## 🛠️ Technologies Used

| Technology         | Description                                                                                             | Link                                                                        |
| :----------------- | :------------------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------- |
| **TypeScript**     | Strongly typed superset of JavaScript, enhancing code quality and developer experience.                 | [TypeScript](https://www.typescriptlang.org/)                               |
| **Node.js**        | JavaScript runtime for building scalable server-side applications.                                      | [Node.js](https://nodejs.org/)                                              |
| **Express.js**     | Fast, unopinionated, minimalist web framework for Node.js.                                              | [Express.js](https://expressjs.com/)                                        |
| **Drizzle ORM**    | Lightweight, performant TypeScript ORM for PostgreSQL, designed for type safety.                        | [Drizzle ORM](https://orm.drizzle.team/)                                    |
| **PostgreSQL**     | Powerful, open-source relational database system.                                                       | [PostgreSQL](https://www.postgresql.org/)                                   |
| **Redis**          | In-memory data structure store, used here for caching and rate limiting.                                | [Redis](https://redis.io/)                                                  |
| **Cloudinary**     | Cloud-based image and video management solution.                                                        | [Cloudinary](https://cloudinary.com/)                                       |
| **Multer**         | Node.js middleware for handling `multipart/form-data`, primarily for file uploads.                      | [Multer](https://www.npmjs.com/package/multer)                              |
| **Sharp**          | High-performance Node.js image processing, used for image resizing and format conversion.               | [Sharp](https://sharp.pixelplumbing.com/)                                   |
| **pnpm**           | Fast, disk-space efficient package manager for Node.js.                                                 | [pnpm](https://pnpm.io/)                                                    |
| **ioredis**        | Robust, performance-focused Redis client for Node.js.                                                   | [ioredis](https://www.npmjs.com/package/ioredis)                            |
| **express-rate-limit** | Middleware to limit repeated requests to public APIs or endpoints.                                      | [express-rate-limit](https://www.npmjs.com/package/express-rate-limit)      |
| **JWT**            | JSON Web Tokens for secure, stateless user authentication.                                              | [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken)                  |
| **bcryptjs**       | Library for hashing passwords securely.                                                                 | [bcryptjs](https://www.npmjs.com/package/bcryptjs)                          |
| **cuid2**          | Collision-resistant unique IDs, used for primary keys.                                                  | [@paralleldrive/cuid2](https://www.npmjs.com/package/@paralleldrive/cuid2) |
| **Zod**            | TypeScript-first schema declaration and validation library.                                             | [Zod](https://zod.dev/)                                                     |
| **Vercel**         | Platform for static sites and serverless functions, used for deployment.                                | [Vercel](https://vercel.com/)                                               |

## 🤝 Contributing

We welcome contributions to enhance and improve the Gempire API! If you're interested in contributing, please consider the following:

*   🐛 **Reporting Bugs**: If you find any issues, please open a detailed issue describing the problem and steps to reproduce it.
*   💡 **Suggesting Features**: Feel free to propose new features or improvements by opening an issue.
*   👨‍💻 **Code Contributions**:
    *   Fork the repository.
    *   Create a new branch for your feature or bug fix.
    *   Ensure your code adheres to the existing style and conventions.
    *   Write clear, concise commit messages.
    *   Open a pull request to the `main` branch.

## 📄 License

This project is licensed under the **ISC License**. See the `package.json` file for more details.

## ✍️ Author

*   **Your Name/Handle**
    *   GitHub: [Your GitHub Profile](https://github.com/your-username)
    *   LinkedIn: [Your LinkedIn Profile](https://linkedin.com/in/your-profile)
    *   Portfolio: [Your Portfolio Website](https://your-portfolio.com)

---

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)](https://cloudinary.com/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle%20ORM-E98284?style=for-the-badge&logo=drizzle&logoColor=white)](https://orm.drizzle.team/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=for-the-badge)](https://opensource.org/licenses/ISC)
[![Readme was generated by Dokugen](https://img.shields.io/badge/Readme%20was%20generated%20by-Dokugen-brightgreen)](https://www.npmjs.com/package/dokugen)