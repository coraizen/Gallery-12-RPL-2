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
