# FreightTiger TMS Summary Dashboard

A comprehensive React-based dashboard for FreightTiger Transportation Management System (TMS), providing real-time visibility into orders, journeys, shipments, and indents.

## 🚀 Features

- **Multi-Module Dashboard**: Orders, Journeys, Shipments, and Indents tracking
- **Real-time Data**: Live updates from FreightTiger TMS APIs
- **Advanced Filtering**: Filter by location, transporter, date range, and priority
- **Lifecycle Tracking**: Visual representation of order/journey lifecycles
- **Exception Management**: Track and manage exceptions and alerts
- **Authentication**: Secure login with token management
- **Responsive Design**: Built with FT Design System components

## 📋 Prerequisites

- **Node.js**: v18+ recommended
- **npm** or **yarn**: Package manager
- **Git**: Version control

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/chetanft/Landing-page.git
   cd Landing-page
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # API Configuration
   FT_TMS_API_BASE_URL=https://api.freighttiger.com
   FT_TMS_PROXY_URL=
   FT_TMS_AUTH_URL=https://api.freighttiger.com/api/authentication/v1/auth/login
   FT_TMS_UNIQUE_ID=your_unique_id
   FT_TMS_APP_ID=web
   FT_TMS_BRANCH_FTEID=your_branch_fteid
   
   # Proxy Server (optional, for local development)
   FT_TMS_PROXY_PORT=8787
   FT_TMS_USERNAME=your_username
   FT_TMS_PASSWORD=your_encrypted_password
   FT_TMS_API_TOKEN=your_api_token
   ```

## 🚀 Running the Application

### Development Mode

1. **Start the proxy server** (optional, for local API proxying):
   ```bash
   node scripts/ft-tms-proxy.mjs
   ```
   Runs on `http://localhost:8787`

2. **Start the development server**:
   ```bash
   npm run dev
   ```
   Runs on `http://localhost:5173`

3. **Open your browser**:
   ```
   http://localhost:5173
   ```

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
Landing-page/
├── src/
│   ├── modules/
│   │   └── summary-dashboard/
│   │       ├── auth/              # Authentication services
│   │       ├── components/        # React components
│   │       ├── config/            # Configuration files
│   │       ├── data/              # API services
│   │       ├── hooks/             # Custom React hooks
│   │       ├── pages/             # Page components
│   │       ├── types/             # TypeScript types
│   │       └── utils/              # Utility functions
│   ├── App.tsx                     # Main app component
│   ├── main.tsx                    # Entry point
│   └── index.css                   # Global styles
├── scripts/
│   └── ft-tms-proxy.mjs           # Local proxy server
├── docs/                           # Documentation
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 🔐 Authentication

The application uses JWT-based authentication with the FreightTiger TMS API.

### Password Encryption

Passwords must be AES encrypted before sending to the API. Use the included tool:

1. Open `password-encryptor.html` in your browser
2. Enter your username and plain password
3. Copy the encrypted password and dynamic ID
4. Set them in your environment variables

See [PASSWORD_ENCRYPTION_GUIDE.md](./PASSWORD_ENCRYPTION_GUIDE.md) for detailed instructions.

## 📚 API Documentation

- **cURL Commands**: See [API_CURL_COMMANDS.md](./API_CURL_COMMANDS.md)
- **Postman Collection**: Import `FreightTiger_TMS_API.postman_collection.json`
- **Postman Environment**: Import `FreightTiger_TMS_Environment.postman_environment.json`
- **Setup Guide**: See [POSTMAN_SETUP_GUIDE.md](./POSTMAN_SETUP_GUIDE.md)

## 🧪 Testing APIs

### Using Postman

1. Import the Postman collection and environment files
2. Set your credentials in the environment variables
3. Run the Login request first (auto-saves token)
4. Test other APIs

### Using cURL

See [API_CURL_COMMANDS.md](./API_CURL_COMMANDS.md) for all available cURL commands.

## 🎨 Design System

This project uses **FT Design System** components exclusively. See:
- [DESIGN_SYSTEM_AUDIT.md](./DESIGN_SYSTEM_AUDIT.md) - Design system audit
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Migration patterns

## 📖 Documentation

- [PROJECT_ANALYSIS_REPORT.md](./PROJECT_ANALYSIS_REPORT.md) - Complete project analysis
- [MODULE_NAVIGATION_README.md](./MODULE_NAVIGATION_README.md) - Module navigation guide
- [TROUBLESHOOTING_401_LOGIN.md](./TROUBLESHOOTING_401_LOGIN.md) - Login troubleshooting

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `FT_TMS_API_BASE_URL` | Base URL for TMS API | Yes |
| `FT_TMS_AUTH_URL` | Authentication endpoint | No (has default) |
| `FT_TMS_UNIQUE_ID` | Unique ID for encryption | Yes |
| `FT_TMS_APP_ID` | Application ID | No (default: "web") |
| `FT_TMS_BRANCH_FTEID` | Branch FTEID | Optional |
| `FT_TMS_PROXY_PORT` | Proxy server port | No (default: 8787) |

### Proxy Server

The proxy server (`scripts/ft-tms-proxy.mjs`) handles:
- CORS issues in development
- Automatic token management
- Request forwarding to TMS APIs

## 🐛 Troubleshooting

### 401 Unauthorized Errors

See [TROUBLESHOOTING_401_LOGIN.md](./TROUBLESHOOTING_401_LOGIN.md) for detailed troubleshooting steps.

Common issues:
- Missing Origin/Referer headers
- Password encryption mismatch
- Dynamic ID mismatch
- Token expiration

### Port Already in Use

```bash
# Kill processes on ports 5173 or 8787
lsof -ti:5173,8787 | xargs kill -9
```

## 📝 Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

ISC

## 🔗 Links

- **Repository**: https://github.com/chetanft/Landing-page
- **API Documentation**: See `API_CURL_COMMANDS.md`
- **Postman Collection**: `FreightTiger_TMS_API.postman_collection.json`

## 📞 Support

For issues and questions:
- Check the troubleshooting guides in the `docs/` folder
- Review API documentation in `API_CURL_COMMANDS.md`
- Check Postman collection for API examples

---

**Built with**: React 19, TypeScript, Vite, FT Design System, React Query
