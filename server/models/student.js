const prisma = require("../utils/prisma");
const { EventLogs } = require("./eventLogs");

const Student = {
  create: async function (data) {
    try {
      const student = await prisma.students.create({ data });
      await EventLogs.logEvent("student_created", { name: data.name }, data.user_id);
      return student;
    } catch (error) {
      console.error("Error creating student:", error.message);
      throw error;
    }
  },

  get: async function (where = {}) {
    try {
      return await prisma.students.findFirst({ where });
    } catch (error) {
      console.error("Error fetching student:", error.message);
      return null;
    }
  },

  update: async function (id, data) {
    try {
      return await prisma.students.update({
        where: { id: parseInt(id) },
        data,
      });
    } catch (error) {
      console.error("Error updating student:", error.message);
      throw error;
    }
  },

  delete: async function (where) {
    try {
      await prisma.students.deleteMany({ where });
      return true;
    } catch (error) {
      console.error("Error deleting student:", error.message);
      return false;
    }
  },
};

module.exports = { Student };