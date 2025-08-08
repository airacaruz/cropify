import React from "react";
import { db } from "./firebase"; // Adjust the path if needed
import { collection, addDoc } from "firebase/firestore";

const Test = () => {

  const addTest = async () => {
    try {
      await addDoc(collection(db, "testCollection"), {
        testField: "Cropify is working!",
        createdAt: new Date()
      });
      console.log("Data added successfully!");
    } catch (error) {
      console.error("Error adding document:", error);
    }
  };

  return (
    <div>
      <h1>Test Firebase Connection</h1>
      <button onClick={addTest}>Send Test Data</button>
    </div>
  );
};

export default Test;
