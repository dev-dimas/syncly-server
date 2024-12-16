import prismaClient from 'src/config/prisma';
import type { SSEClient } from 'src/types/types';

export const sseClients: SSEClient[] = [];

type NotificationParams =
  | { type: 'ADDED_TO_PROJECT'; projectName: string }
  | { type: 'KICKED_FROM_PROJECT'; projectName: string }
  | { type: 'MEMBER_QUIT'; projectName: string; memberName: string }
  | { type: 'PROJECT_DELETED'; projectName: string }
  | { type: 'PROJECT_RENAMED'; oldName: string; newName: string }
  | { type: 'TASK_RENAMED'; oldName: string; newName: string }
  | { type: 'ASSIGNED_TO_TASK'; taskName: string; by: string }
  | { type: 'TASK_DELETED'; taskName: string; by: string }
  | {
      type: 'TASK_STATUS_CHANGED';
      taskName: string;
      by: string;
      updatedData: string;
    }
  | {
      type: 'TASK_DUEDATE_CHANGED';
      taskName: string;
      by: string;
      updatedData: string;
    };

async function createNotification(
  clientIds: string[],
  { title, description }: { title: string; description: string }
) {
  await prismaClient.notification.create({
    data: {
      title,
      description,
      users: {
        createMany: {
          data: clientIds.map((client) => ({ userId: client })),
          skipDuplicates: true
        }
      }
    }
  });
}

async function createNotificationMessage(
  clientIds: string[],
  params: NotificationParams
): Promise<string> {
  let message: string;
  switch (params.type) {
    case 'ADDED_TO_PROJECT':
      message = `You have been added to project ${params.projectName}`;
      await createNotification(clientIds, {
        title: params.projectName,
        description: message
      });
      return message;
    case 'KICKED_FROM_PROJECT':
      message = `You have been removed from project ${params.projectName}`;
      await createNotification(clientIds, {
        title: params.projectName,
        description: message
      });
      return message;
    case 'MEMBER_QUIT':
      message = `${params.memberName} has quit or left your project project ${params.projectName}`;
      await createNotification(clientIds, {
        title: params.projectName,
        description: message
      });
      return message;
    case 'PROJECT_RENAMED':
      message = `Project ${params.oldName} has been renamed to ${params.newName}`;
      await createNotification(clientIds, {
        title: params.newName,
        description: message
      });
      return message;
    case 'PROJECT_DELETED':
      message = `Project ${params.projectName} has been deleted by the owner`;
      await createNotification(clientIds, {
        title: params.projectName,
        description: message
      });
      return message;
    case 'ASSIGNED_TO_TASK':
      message = `You have been assigned to task ${params.taskName} by ${params.by}`;
      await createNotification(clientIds, {
        title: params.taskName,
        description: message
      });
      return message;
    case 'TASK_RENAMED':
      message = `Task ${params.oldName} has been renamed to ${params.newName}`;
      await createNotification(clientIds, {
        title: params.newName,
        description: message
      });
      return message;
    case 'TASK_DELETED':
      message = `Task ${params.taskName} has been deleted by ${params.by}`;
      await createNotification(clientIds, {
        title: params.taskName,
        description: message
      });
      return message;
    case 'TASK_STATUS_CHANGED':
      message = `Task ${params.taskName} has been marked as ${params.updatedData} by ${params.by}`;
      await createNotification(clientIds, {
        title: params.taskName,
        description: message
      });
      return message;
    case 'TASK_DUEDATE_CHANGED':
      message = `Task ${params.taskName} due date has been changed to ${params.updatedData} by ${params.by}`;
      await createNotification(clientIds, {
        title: params.taskName,
        description: message
      });
      return message;
    default:
      throw new Error(
        `Invalid notification type: ${
          (params as Record<string, string>)['type']
        }`
      );
  }
}

/**
 * Send SSE message to client
 * @param {string} clientIds - Array of client ids (user id)
 * @param {string} params - Message parameter
 */
export const sendSSEMessage = async (
  clientIds: string[],
  params: NotificationParams
) => {
  const message = await createNotificationMessage(clientIds, params);

  const clients = sseClients.filter((client) => clientIds.includes(client.id));

  if (clients.length === 0) return;

  for (const client of clients) {
    client.response.write(`data: ${message}\n\n`);
    client.response.flush();
  }
};
