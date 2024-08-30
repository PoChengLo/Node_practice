import jwt from "jsonwebtoken";

const JWT_KEY = "askmdamsdpampdmapsmdaldpoqwpol";
const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MjcsImFjY291bnQiOiJKb2huIiwiaWF0IjoxNzI0OTkwNTIzfQ.cgIVXO8GGP3LSuOxL-2b1giF9mZgKqNDxfbydSxthIk";

const payload = jwt.verify(token, JWT_KEY);
console.log(payload);
