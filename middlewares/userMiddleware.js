const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");

const SECRET_KEY = SECRET_KEY;


const userMiddleware = (req, res, next) => {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    console.log(authHeader)
    if (!authHeader) {
      return res.status(401).json({ message: "Authorization header is missing." });
    }

    // Extract the token
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Token is missing." });
    }
    console.log(token)

    // Verify the token
    const secretKey = SECRET_KEY; // Ensure you have a secret key set in your environment variables
    const decodedToken = jwt.verify(token, secretKey);

    if (!decodedToken || !decodedToken.userId) {
      return res.status(401).json({ message: "Invalid token." });
    }

    // Set the userId in the request object
    req.userId = decodedToken.userId;
    console.log(req.userId)

    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({ message: "Authentication failed.", error: error.message });
  }
};

module.exports = userMiddleware;
