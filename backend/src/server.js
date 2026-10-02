const app = require('./app');
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Farm Direct API running on http://localhost:${port}`));
