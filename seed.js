import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(
  readFileSync("./serviceAccount.json", "utf8"),
);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const students = JSON.parse(readFileSync("./data/students.json", "utf8"));
const teachers = JSON.parse(readFileSync("./data/teachers.json", "utf8"));

for (const s of students) {
  await db
    .collection("students")
    .doc(String(s.id).padStart(2, "0"))
    .set(s, { merge: true });
  console.log("Seeded student:", s.name);
}

for (const t of teachers) {
  await db.collection("teachers").doc(String(t.id)).set(t, { merge: true });
  console.log("Seeded teacher:", t.name);
}

console.log("Selesai.");
