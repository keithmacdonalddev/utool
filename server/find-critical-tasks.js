const mongoose = require("mongoose");
const Task = require("./models/Task");

async function findCriticalTasks() {
  try {
    await mongoose.connect("mongodb://localhost:27017/productivity-app", { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const tasks = await Task.find({ 
      "status": { "$ne": "Completed" }, 
      "dueDate": { "$lt": tomorrow } 
    })
    .sort("dueDate")
    .select("title dueDate status priority")
    .limit(10);
    
    console.log("Critical Tasks (overdue or due today):");
    tasks.forEach(task => {
      const dueDate = new Date(task.dueDate);
      const isToday = dueDate >= today && dueDate < tomorrow;
      const isOverdue = dueDate < today;
      
      console.log(`Title: ${task.title}`);
      console.log(`Due Date: ${task.dueDate.toDateString()} ${isOverdue ? "(OVERDUE)" : isToday ? "(TODAY)" : ""}`);
      console.log(`Status: ${task.status}, Priority: ${task.priority}`);
      console.log("-------------------");
    });
    
    mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
    mongoose.disconnect();
  }
}

findCriticalTasks();
