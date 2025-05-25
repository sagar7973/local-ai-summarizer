const express = require('express');
const multer = require('multer');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

const app = express();
const port = 3000;

// Serve static HTML/CSS from "public"
app.use(express.static('public'));

// Create "uploads" folder if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads'),
  filename: (req, file, cb) => {
    const uniqueName = `file-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Home route → index.html
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Handle upload + call Python script
app.post('/upload', upload.single('file'), (req, res) => {
  const uploadedFile = req.file;
  if (!uploadedFile) return res.send('Error: No file uploaded.');

  const filePath = path.join(__dirname, uploadedFile.path);
  const fileName = uploadedFile.originalname;

  console.log(`Received file: ${fileName}`);
  console.log(`Saved to: ${filePath}`);

  // Call Python script
  exec(`"C:\\Users\\sagar\\Anaconda3\\python.exe" summarizer.py "${filePath}"`, (err, stdout, stderr) => {
    if (err) {
      console.error(`Python error: ${stderr}`);
      return res.send(`
        <div style="padding: 20px; font-family: sans-serif;">
          <h3>Error during summarization</h3>
          <pre>${stderr || err.message}</pre>
          <a href="/">Try again</a>
        </div>
      `);
    }

    // Show summary with styling
    res.send(`
      <html>
      <head>
        <title>Summary Result</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
          }
          .container {
            max-width: 700px;
            margin: 60px auto;
            background: white;
            padding: 30px 40px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
          }
          h2 {
            color: #333;
          }
          .summary-box {
            background-color: #f8f8f8;
            border-left: 5px solid #007bff;
            padding: 20px;
            margin-top: 20px;
            white-space: pre-wrap;
            font-family: 'Courier New', Courier, monospace;
            overflow-x: auto;
          }
          a {
            display: inline-block;
            margin-top: 20px;
            text-decoration: none;
            color: #007bff;
          }
          a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Summary for ${fileName}</h2>
          <div class="summary-box">${stdout}</div>
          <a href="/">Upload another file</a>
        </div>
      </body>
      </html>
    `);
  });
});

app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
