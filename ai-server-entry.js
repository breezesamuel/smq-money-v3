#!/usr/bin/env node
const express = require('express');
const cors = require('cors');

const { AIEmployeeManager } = require('./ai-core/employees');
const { CommandCenter } = require('./ai-core/command-center');
const { AIBrain } = require('./ai-core/ai-brain');

const app = express();
const PORT = 3003;

app.use(cors());
app.use(express.json());

const aiManager = new AIEmployeeManager();
const commandCenter = new CommandCenter(aiManager);
const aiBrain = new AIBrain();

app.get('/api/ai/status', (req, res) => {
  res.json({ status: 'online', time: new Date().toISOString() });
});

app.get('/api/ai/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.post('/api/ai/brain/think', (req, res) => {
  const { prompt } = req.body;
  aiBrain.think(prompt).then(result => {
    res.json({ success: true, result });
  }).catch(err => {
    res.json({ success: false, error: err.message });
  });
});

app.listen(PORT, function() {
  console.log('AI Server running on port ' + PORT);
});

module.exports = app;

if (require.main === module) {
  // Run when called directly
  app._listen = app.listen(PORT);
}
