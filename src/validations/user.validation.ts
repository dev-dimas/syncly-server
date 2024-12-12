import Joi from 'joi';

export interface UpdateUserDTO {
  name?: string;
  email?: string;
  deleteAvatar?: boolean;
}

export const updateUserSchema = {
  body: Joi.object<UpdateUserDTO>().keys({
    name: Joi.string().min(2),
    email: Joi.string().email(),
    deleteAvatar: Joi.boolean()
  })
};
