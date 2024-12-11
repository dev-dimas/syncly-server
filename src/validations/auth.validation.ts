import Joi from 'joi';

export interface SignUpDTO {
  name: string;
  email: string;
  password: string;
}
export const signupSchema = {
  body: Joi.object<SignUpDTO>().keys({
    name: Joi.string().required().min(2),
    email: Joi.string().required().email(),
    password: Joi.string().required().min(8).max(150)
  })
};

export type LoginDTO = Omit<SignUpDTO, 'name'>;
export const loginSchema = {
  body: Joi.object<LoginDTO>().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required().min(6).max(150)
  })
};
