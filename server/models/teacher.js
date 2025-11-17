const prisma = require("../utils/prisma");
const { EventLogs } = require("./eventLogs");

const Teacher = {
  create: async function (data) {
    try {
      const teacher = await prisma.teachers.create({ data });
      await EventLogs.logEvent("teacher_created", { name: data.name }, data.user_id);
      return teacher;
    } catch (error) {
      console.error("Error creating teacher:", error.message);
      throw error;
    }
  },

  get: async function (where = {}) {
    try {
      return await prisma.teachers.findFirst({ where });
    } catch (error) {
      console.error("Error fetching teacher:", error.message);
      return null;
    }
  },

  update: async function (id, data) {
    try {
      return await prisma.teachers.update({
        where: { id: parseInt(id) },
        data,
      });
    } catch (error) {
      console.error("Error updating teacher:", error.message);
      throw error;
    }
  },

  delete: async function (where) {
    try {
      await prisma.teachers.deleteMany({ where });
      return true;
    } catch (error) {
      console.error("Error deleting teacher:", error.message);
      return false;
    }
  },
};

module.exports = { Teacher };