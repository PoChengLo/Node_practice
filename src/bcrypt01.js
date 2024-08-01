import bcrypt from "bcrypt";

const hash = await bcrypt.hash('123456', 10);

console.log(hash);

//$2b$10$Ll3hOWpyH4FnXtO8IYf0OuM7LAOneHB5.lylGhS21AdphmElE/Fi6
