const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

const taskController = {
  // Get all tasks with filtering
  // Get all tasks with filtering
getAllTasks: async (req, res) => {
  try {
    const { projectId, status, priority, assignedTo } = req.query;
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }

    // Build filter conditions
    const where = {
      companyId,
      ...(projectId && { projectId }),
      ...(status && { status }),
      ...(priority && { priority }),
      ...(assignedTo && { assignedTo })
    };

    // Get tasks with project and user information
    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: {
          select: {
            name: true
          }
        },
        assignedUser: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        createdByUser: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Format response
    const formattedTasks = tasks.map(task => ({
      id: task.id,
      projectId: task.projectId,
      projectName: task.project?.name || 'مشروع غير محدد',
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      type: task.type,
      assignedTo: task.assignedTo,
      assignedToName: task.assignedUser
        ? `${task.assignedUser.firstName} ${task.assignedUser.lastName}`
        : 'غير محدد',
      createdBy: task.createdBy,
      createdByName: task.createdByUser
        ? `${task.createdByUser.firstName} ${task.createdByUser.lastName}`
        : 'غير محدد',
      dueDate: task.dueDate,
      estimatedHours: task.estimatedHours,
      actualHours: task.actualHours,
      progress: task.progress,
      tags: task.tags || [],
      dependencies: task.dependencies || [],
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    }));

    res.json({
      success: true,
      data: formattedTasks
    });

  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب المهام'
    });
  }
},

  // Create new task
  createTask: async (req, res) => {
    try {
      const {
        projectId,
        title,
        description,
        priority = 'medium',
        type = 'general',
        assignedTo,
        dueDate,
        estimatedHours = 0,
        tags = []
      } = req.body;

      const companyId = req.user.companyId;
      const createdBy = req.user.id;

      if (!companyId) {
        return res.status(403).json({
          success: false,
          message: 'معرف الشركة مطلوب'
        });
      }

      if (!title || !description) {
        return res.status(400).json({
          success: false,
          error: 'العنوان والوصف مطلوبان'
        });
      }

      const newTask = await prisma.task.create({
        data: {
          companyId,
          projectId: projectId || null,
          title,
          description,
          status: 'pending',
          priority,
          type,
          assignedTo: assignedTo || createdBy,
          createdBy,
          dueDate: dueDate ? new Date(dueDate) : null,
          estimatedHours,
          actualHours: 0,
          progress: 0,
          tags: tags,
          dependencies: []
        },
        include: {
          project: {
            select: {
              name: true
            }
          },
          assignedUser: {
            select: {
              name: true
            }
          },
          createdByUser: {
            select: {
              name: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: {
          id: newTask.id,
          projectId: newTask.projectId,
          projectName: newTask.project?.name || 'مشروع غير محدد',
          title: newTask.title,
          description: newTask.description,
          status: newTask.status,
          priority: newTask.priority,
          type: newTask.type,
          assignedTo: newTask.assignedTo,
          assignedToName: newTask.assignedUser?.name || 'غير محدد',
          createdBy: newTask.createdBy,
          createdByName: newTask.createdByUser?.name || 'غير محدد',
          dueDate: newTask.dueDate,
          estimatedHours: newTask.estimatedHours,
          actualHours: newTask.actualHours,
          progress: newTask.progress,
          tags: newTask.tags || [],
          dependencies: newTask.dependencies || [],
          createdAt: newTask.createdAt,
          updatedAt: newTask.updatedAt
        },
        message: 'تم إنشاء المهمة بنجاح'
      });

    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({
        success: false,
        error: 'فشل في إنشاء المهمة'
      });
    }
  },

  // Get task by ID
  getTaskById: async (req, res) => {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      const task = await prisma.task.findFirst({
        where: {
          id,
          companyId
        },
        include: {
          project: {
            select: {
              name: true
            }
          },
          assignedUser: {
            select: {
              name: true
            }
          },
          createdByUser: {
            select: {
              name: true
            }
          }
        }
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'المهمة غير موجودة'
        });
      }

      res.json({
        success: true,
        data: {
          id: task.id,
          projectId: task.projectId,
          projectName: task.project?.name || 'مشروع غير محدد',
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          type: task.type,
          assignedTo: task.assignedTo,
          assignedToName: task.assignedUser?.name || 'غير محدد',
          createdBy: task.createdBy,
          createdByName: task.createdByUser?.name || 'غير محدد',
          dueDate: task.dueDate,
          estimatedHours: task.estimatedHours,
          actualHours: task.actualHours,
          progress: task.progress,
          tags: task.tags || [],
          dependencies: task.dependencies || [],
          createdAt: task.createdAt,
          updatedAt: task.updatedAt
        }
      });

    } catch (error) {
      console.error('Error fetching task:', error);
      res.status(500).json({
        success: false,
        error: 'فشل في جلب المهمة'
      });
    }
  },

  // Update task
  updateTask: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        priority,
        type,
        assignedTo,
        dueDate,
        estimatedHours,
        actualHours,
        progress,
        tags
      } = req.body;
      const companyId = req.user.companyId;

      const updatedTask = await prisma.task.updateMany({
        where: {
          id,
          companyId
        },
        data: {
          ...(title && { title }),
          ...(description && { description }),
          ...(priority && { priority }),
          ...(type && { type }),
          ...(assignedTo && { assignedTo }),
          ...(dueDate && { dueDate: new Date(dueDate) }),
          ...(estimatedHours !== undefined && { estimatedHours }),
          ...(actualHours !== undefined && { actualHours }),
          ...(progress !== undefined && { progress }),
          ...(tags && { tags })
        }
      });

      if (updatedTask.count === 0) {
        return res.status(404).json({
          success: false,
          error: 'المهمة غير موجودة'
        });
      }

      // Get updated task with relations
      const task = await prisma.task.findFirst({
        where: { id, companyId },
        include: {
          project: { select: { name: true } },
          assignedUser: { select: { name: true } },
          createdByUser: { select: { name: true } }
        }
      });

      res.json({
        success: true,
        data: task,
        message: 'تم تحديث المهمة بنجاح'
      });

    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({
        success: false,
        error: 'فشل في تحديث المهمة'
      });
    }
  },

  // Update task status
  updateTaskStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, progress } = req.body;
      const companyId = req.user.companyId;

      const updateData = { status };
      if (progress !== undefined) {
        updateData.progress = progress;
      }

      // If completing task, set progress to 100
      if (status === 'completed') {
        updateData.progress = 100;
      }

      const updatedTask = await prisma.task.updateMany({
        where: {
          id,
          companyId
        },
        data: updateData
      });

      if (updatedTask.count === 0) {
        return res.status(404).json({
          success: false,
          error: 'المهمة غير موجودة'
        });
      }

      // Get updated task with relations
      const task = await prisma.task.findFirst({
        where: { id, companyId },
        include: {
          project: { select: { name: true } },
          assignedUser: { select: { name: true } },
          createdByUser: { select: { name: true } }
        }
      });

      res.json({
        success: true,
        data: task,
        message: 'تم تحديث حالة المهمة بنجاح'
      });

    } catch (error) {
      console.error('Error updating task status:', error);
      res.status(500).json({
        success: false,
        error: 'فشل في تحديث حالة المهمة'
      });
    }
  },

  // Delete task
  deleteTask: async (req, res) => {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      const deletedTask = await prisma.task.deleteMany({
        where: {
          id,
          companyId
        }
      });

      if (deletedTask.count === 0) {
        return res.status(404).json({
          success: false,
          error: 'المهمة غير موجودة'
        });
      }

      res.json({
        success: true,
        message: 'تم حذف المهمة بنجاح'
      });

    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({
        success: false,
        error: 'فشل في حذف المهمة'
      });
    }
  }
};

module.exports = taskController;