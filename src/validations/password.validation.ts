import Joi from 'joi';

export interface ForgotPasswordDTO {
  email: string;
}
export const forgotPasswordSchema = {
  body: Joi.object<ForgotPasswordDTO>().keys({
    email: Joi.string().required().email()
  })
};

export interface ResetPasswordDTO {
  newPassword: string;
}
export const resetPasswordSchema = {
  body: Joi.object().keys({
    newPassword: Joi.string().required().min(6).max(150)
  }),
  params: Joi.object().keys({
    token: Joi.string().uuid()
  })
};
