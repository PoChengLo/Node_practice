import jwt from "jsonwebtoken";

const JWT_KEY = "askmdamsdpampdmapsmdaldpoqwpol";
const data = {
  id: 27,
  account: "John",
};

const token = jwt.sign(data, JWT_KEY);
console.log({ token });
