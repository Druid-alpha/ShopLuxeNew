# ShopLuxe | Premium E-Commerce Platform

ShopLuxe is a high-end, full-stack e-commerce solution built with **Next.js 16 (App Router)**. It features a modern, responsive storefront and a powerful administrative dashboard designed for boutique retail operations.

## Key Features

### 🛍 Storefront
- **Dynamic Product Catalog:** Responsive grid layout with advanced filtering by category, brand, and color.
- **Variant Selection System:** Intuitive selection of sizes and colors for clothing, shoes, and accessories.
- **Real-time Order Tracking:** Detailed order history with live status updates and product variant images.
- **Secure Checkout:** Integrated with Paystack for seamless payment processing.
- **Product Reviews:** Verified customer reviews and ratings system.

### 🛡 Admin Dashboard
- **Comprehensive Management:** Full CRUD operations for products, categories, brands, and colors.
- **Advanced Product Form:** 1,200+ lines of robust logic for managing complex product variants, SKUs, and inventory.
- **Real-time Notifications:** Audio and visual alerts for new orders, user registrations, and return requests.
- **Order Processing:** Streamlined interface for managing shipments, deliveries, and customer returns.
- **User Analytics:** High-level overview of sales performance and user growth.

### 📧 Communication
- **Vibrant Email Templates:** Premium, colorful email designs for order confirmations, shipping updates, and return processing.
- **Support Integration:** Real-time messaging system for customer support and return requests.

## Tech Stack

- **Framework:** Next.js 15+ (App Router, Server Actions, Route Handlers)
- **State Management:** Redux Toolkit & RTK Query
- **Database:** MongoDB with Mongoose
- **Styling:** Tailwind CSS & Lucide Icons
- **Authentication:** JWT-based secure auth with HTTP-only cookies
- **Cloud Infrastructure:** Cloudinary for media storage, Vercel for deployment

## Getting Started

### Prerequisites
- Node.js 18.x or higher
- MongoDB Atlas account or local MongoDB instance
- Cloudinary account
- Paystack account (for payments)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Druid-alpha/ShopLuxeNew.git
   cd ShopLuxeNew
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env.local` file and populate the required keys (see `.env.example` or project documentation for the full list of MongoDB, Cloudinary, and Paystack credentials).

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) to view the shop.

## Contributing

This project is maintained for private boutique operations. For support or feature requests, please contact the repository administrator.

---
*Built with passion by the ShopLuxe Engineering Team.*
