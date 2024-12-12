import Joi from 'joi';

export const projectIdParams = {
  params: Joi.object().keys({
    projectId: Joi.string().uuid().required()
  })
};

export interface CreateProjectDTO {
  name: string;
  isTeamProject: boolean;
}
export const createProjectSchema = {
  body: Joi.object<CreateProjectDTO>().keys({
    name: Joi.string().required().min(2),
    isTeamProject: Joi.boolean().required()
  })
};

export interface UpdateProjectDTO {
  name: string;
}
export const updateProjectSchema = {
  body: Joi.object<UpdateProjectDTO>().keys({
    name: Joi.string().min(2)
  }),
  ...projectIdParams
};

export interface GetProjectMembersDTO {
  page?: number;
  limit?: number;
}
export const getProjectMembersSchema = {
  body: Joi.object<GetProjectMembersDTO>().keys({
    page: Joi.number().min(1),
    limit: Joi.number().min(1)
  }),
  ...projectIdParams
};

export interface AddProjectMemberDTO {
  email: string;
}
export const addProjectMemberSchema = {
  body: Joi.object<AddProjectMemberDTO>().keys({
    email: Joi.string().email().required()
  }),
  ...projectIdParams
};

export interface RemoveProjectMemberDTO {
  userId: string;
}
export const removeProjectMemberSchema = {
  body: Joi.object<RemoveProjectMemberDTO>().keys({
    userId: Joi.string().email().required()
  }),
  ...projectIdParams
};
