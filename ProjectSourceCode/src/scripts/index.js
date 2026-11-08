// Dependencies
require('dotenv').config();

const app = require('./app');
const { db } = require('./db');

const PORT = process.env.PORT || 3000;


// Start server and establish database connection
if (require.main === module) {
  const startServer = async () => {
    try {
      // Verify PostgreSQL connectivity
      await db.connect();

      console.log('Database connection successful');

      // Start the server only after database verification
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });

    } catch (error) {
      console.error('Database connection failed:', error.message || error);
      process.exit(1);
    }
  };

  startServer();
}
