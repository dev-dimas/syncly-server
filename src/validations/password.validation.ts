import Joi from 'joi';

export interface ForgotPasswordDTO {
  email: string;
}
export const forgotPasswordSchema = {
  body: Joi.object<ForgotPasswordDTO>().keys({
    email: Joi.string().required().email()
  })
};

export type ResetPasswordDTO = Pick<ChangePasswordDTO, 'newPassword'>;
export const resetPasswordSchema = {
  body: Joi.object<ResetPasswordDTO>().keys({
    newPassword: Joi.string().required().min(6).max(150)
  }),
  params: Joi.object().keys({
    token: Joi.string()
  })
};

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}
export const changePasswordSchema = {
  body: Joi.object<ChangePasswordDTO>().keys({
    currentPassword: Joi.string().required().min(8).max(150),
    newPassword: Joi.string().required().min(8).max(150)
  })
};
