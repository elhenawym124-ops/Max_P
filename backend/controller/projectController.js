const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

const projectController = {
  // Get all projects
  getAllProjects: async (req, res) => {
    try {
      const companyId = req.user.companyId;

      if (!companyId) {
        return res.status(403).json({
          success: false,
          message: 'معرف الشركة مطلوب'
        });
      }

      const projects = await prisma.project.findMany({
        where: {
          companyId
        },
        include: {
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          tasks: {
            select: {
              id: true,
              status: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Format response with calculated stats
      const formattedProjects = projects.map(project => {
        const totalTasks = project.tasks.length;
        const completedTasks = project.tasks.filter(task => task.status === 'completed').length;
        const calculatedProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          priority: project.priority,
          startDate: project.startDate,
          endDate: project.endDate,
          budget: project.budget,
          spentBudget: project.spentBudget || 0,
          progress: project.progress || calculatedProgress,
          managerId: project.managerId,
          managerName: project.manager ? `${project.manager.firstName} ${project.manager.lastName}` : 'غير محدد',
          teamMembers: project.teamMembers || [],
          tags: project.tags || [],
          createdAt: project.createdAt,
          totalTasks,
          completedTasks
        };
      });

      res.json({
        success: true,
        data: formattedProjects
      });

    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({
        success: false,
        error: 'فشل في جلب المشاريع'
      });
    }
  },


  // Create new project
  createProject: async (req, res) => {
    try {
      const {
        name,
        description,
        priority = 'medium',
        startDate,
        endDate,
        budget = 0,
        managerId,
        teamMembers = [],
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

      if (!name || !description) {
        return res.status(400).json({
          success: false,
          error: 'اسم المشروع والوصف مطلوبان'
        });
      }

      const newProject = await prisma.project.create({
        data: {
          companyId,
          name,
          description,
          status: 'planning',
          priority,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          budget,
          spentBudget: 0,
          progress: 0,
          managerId: managerId || createdBy,
          teamMembers,
          tags
        },
        include: {
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: {
          id: newProject.id,
          name: newProject.name,
          description: newProject.description,
          status: newProject.status,
          priority: newProject.priority,
          startDate: newProject.startDate,
          endDate: newProject.endDate,
          budget: newProject.budget,
          spentBudget: newProject.spentBudget,
          progress: newProject.progress,
          managerId: newProject.managerId,
          managerName: newProject.manager ? `${newProject.manager.firstName} ${newProject.manager.lastName}` : 'غير محدد',
          teamMembers: newProject.teamMembers || [],
          tags: newProject.tags || [],
          createdAt: newProject.createdAt
        },
        message: 'تم إنشاء المشروع بنجاح'
      });

    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({
        success: false,
        error: 'فشل في إنشاء المشروع'
      });
    }
  },

  // Get project by ID
  getProjectById: async (req, res) => {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      const project = await prisma.project.findFirst({
        where: {
          id,
          companyId
        },
        include: {
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          tasks: {
            include: {
              assignedUser: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              },
              createdByUser: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        }
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'المشروع غير موجود'
        });
      }

      // Calculate project statistics
      const totalTasks = project.tasks.length;
      const completedTasks = project.tasks.filter(task => task.status === 'completed').length;
      const inProgressTasks = project.tasks.filter(task => task.status === 'in_progress').length;
      const pendingTasks = project.tasks.filter(task => task.status === 'pending').length;

      res.json({
        success: true,
        data: {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          priority: project.priority,
          startDate: project.startDate,
          endDate: project.endDate,
          budget: project.budget,
          spentBudget: project.spentBudget || 0,
          progress: project.progress,
          managerId: project.managerId,
          managerName: project.manager ? `${project.manager.firstName} ${project.manager.lastName}` : 'غير محدد',
          teamMembers: project.teamMembers || [],
          tags: project.tags || [],
          createdAt: project.createdAt,
          tasks: project.tasks.map(task => ({
            ...task,
            assignedUserName: task.assignedUser ? `${task.assignedUser.firstName} ${task.assignedUser.lastName}` : 'غير محدد',
            createdByUserName: task.createdByUser ? `${task.createdByUser.firstName} ${task.createdByUser.lastName}` : 'غير محدد'
          })),
          statistics: {
            totalTasks,
            completedTasks,
            inProgressTasks,
            pendingTasks,
            completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
          }
        }
      });

    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({
        success: false,
        error: 'فشل في جلب المشروع'
      });
    }
  },

  // Update project
  updateProject: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        status,
        priority,
        startDate,
        endDate,
        budget,
        spentBudget,
        progress,
        managerId,
        teamMembers,
        tags
      } = req.body;
      const companyId = req.user.companyId;

      const updatedProject = await prisma.project.updateMany({
        where: {
          id,
          companyId
        },
        data: {
          ...(name && { name }),
          ...(description && { description }),
          ...(status && { status }),
          ...(priority && { priority }),
          ...(startDate && { startDate: new Date(startDate) }),
          ...(endDate && { endDate: new Date(endDate) }),
          ...(budget !== undefined && { budget }),
          ...(spentBudget !== undefined && { spentBudget }),
          ...(progress !== undefined && { progress }),
          ...(managerId && { managerId }),
          ...(teamMembers && { teamMembers }),
          ...(tags && { tags })
        }
      });

      if (updatedProject.count === 0) {
        return res.status(404).json({
          success: false,
          error: 'المشروع غير موجود'
        });
      }

      // Get updated project with relations
      const project = await prisma.project.findFirst({
        where: { id, companyId },
        include: {
          manager: { select: { name: true } }
        }
      });

      res.json({
        success: true,
        data: project,
        message: 'تم تحديث المشروع بنجاح'
      });

    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({
        success: false,
        error: 'فشل في تحديث المشروع'
      });
    }
  },

  // Delete project
  deleteProject: async (req, res) => {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      // Check if project has tasks
      const tasksCount = await prisma.task.count({
        where: {
          projectId: id,
          companyId
        }
      });

      if (tasksCount > 0) {
        return res.status(400).json({
          success: false,
          error: 'لا يمكن حذف المشروع لأنه يحتوي على مهام. يجب حذف المهام أولاً.'
        });
      }

      const deletedProject = await prisma.project.deleteMany({
        where: {
          id,
          companyId
        }
      });

      if (deletedProject.count === 0) {
        return res.status(404).json({
          success: false,
          error: 'المشروع غير موجود'
        });
      }

      res.json({
        success: true,
        message: 'تم حذف المشروع بنجاح'
      });

    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({
        success: false,
        error: 'فشل في حذف المشروع'
      });
    }
  },

  // Get project tasks
  getProjectTasks: async (req, res) => {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      const tasks = await prisma.task.findMany({
        where: {
          projectId: id,
          companyId
        },
        include: {
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
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json({
        success: true,
        data: tasks
      });

    } catch (error) {
      console.error('Error fetching project tasks:', error);
      res.status(500).json({
        success: false,
        error: 'فشل في جلب مهام المشروع'
      });
    }
  }
};

module.exports = projectController;