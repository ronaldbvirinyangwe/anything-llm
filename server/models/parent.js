const prisma = require("../utils/prisma");
const { EventLogs } = require("./eventLogs");

const Parent = {
  create: async function (data) {
    try {
      const parent = await prisma.parents.create({ data });
      await EventLogs.logEvent("parent_created", { name: data.name }, data.user_id);
      return parent;
    } catch (error) {
      console.error("Error creating parent:", error.message);
      throw error;
    }
  },

  get: async function (where = {}) {
    try {
      return await prisma.parents.findFirst({ where });
    } catch (error) {
      console.error("Error fetching parent:", error.message);
      return null;
    }
  },

  update: async function (id, data) {
    try {
      return await prisma.parents.update({
        where: { id: parseInt(id) },
        data,
      });
    } catch (error) {
      console.error("Error updating parent:", error.message);
      throw error;
    }
  },

  delete: async function (where) {
    try {
      await prisma.parents.deleteMany({ where });
      return true;
    } catch (error) {
      console.error("Error deleting parent:", error.message);
      return false;
    }
  },
};

module.exports = { Parent };