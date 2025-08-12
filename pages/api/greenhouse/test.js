export default function handler(req, res) {
  console.log('=== TEST API CALLED ===');
  res.status(200).json({ message: 'Test API working', timestamp: new Date().toISOString() });
}
