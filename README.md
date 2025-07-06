# Invoicer Pro

## Environment Variables Setup

This project uses Firebase and other third-party services that require sensitive configuration keys. To keep these keys secure, they are stored in a `.env` file which is not committed to version control.

### Steps to run the project after cloning:

1. Copy the `.env.example` file to `.env` in the root directory:
   ```
   cp .env.example .env
   ```
2. Replace the placeholder values in `.env` with your actual Firebase project credentials.
3. Install dependencies and start the project as usual:
   ```
   npm install
   npm run dev
   ```
4. The project will use the environment variables from `.env` to initialize Firebase.

Make sure **not** to commit your `.env` file to the repository to keep your credentials safe.

Invoicer Pro is a React and Firebase-based invoicing web application designed to streamline business billing needs. It features user authentication, invoice creation and management, customer and product tracking, and professional PDF invoice generation. The app provides a clean and intuitive interface for managing invoices, customers, and products efficiently.

## Features

- User authentication with secure login and signup
- Dashboard overview of invoices and business metrics
- Create, edit, and manage invoices with detailed line items
- Generate professional PDF invoices for download or printing
- Manage customers and their details
- Manage products and pricing information
- Responsive and user-friendly interface built with React and TypeScript
- Firebase integration for backend services including authentication and data storage

## Prerequisites

- Node.js installed on your machine
- A Gemini API key (if applicable, based on environment variables)

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd invoicer-pro
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

## Running the App Locally

Start the development server with:

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:3000` (or the port specified in your terminal) to access the app.

## Project Structure

- `components/` - Reusable React components including invoice PDF generation
- `hooks/` - Custom React hooks such as authentication handling
- `layouts/` - Layout components for authenticated and unauthenticated views
- `pages/` - Application pages including dashboard, invoices, customers, products, login, and signup
- `services/` - Backend service integrations, e.g., Firebase configuration
- `App.tsx` - Main application component with routing and authentication guards

## Technologies Used

- React
- TypeScript
- Firebase (Authentication, Firestore)
- React Router
- @react-pdf/renderer for PDF invoice generation
- Vite for build tooling

## Contributing

Contributions are welcome! Please open issues or submit pull requests for improvements or bug fixes.

## License

This project is licensed under the MIT License.

## Acknowledgments

Thanks to all contributors and the open-source community for the tools and libraries used in this project.
