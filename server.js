const express = require("express");
const path = require("path")
const app = express();

// Serve static assets if in production
if (process.env.NODE_ENV === 'production') {
    // Set static folder
    app.use(express.static(path.resolve(__dirname, 'dist')));

    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, 'dist',  'index.html'));
    });
}


const port = process.env.PORT || 80;

const server = app.listen(port,() => {
    console.log(`App listening on port ${port}`);
});
