import { Router } from 'express';
import validate from '../middleware/validate';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../validations/password.validation';
import * as passwordController from '../controller/password.controller';

const passwordRouter = Router();

passwordRouter.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  passwordController.handleForgotPassword
);
passwordRouter.post(
  '/reset-password/:token',
  validate(resetPasswordSchema),
  passwordController.handleResetPassword
);
passwordRouter.post(
  '/change-password',
  validate(changePasswordSchema),
  passwordController.handleChangePassword
);

export default passwordRouter;
