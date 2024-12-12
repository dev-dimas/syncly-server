import { Router } from 'express';
import * as authController from '../controller/auth.controller';
import validate from '../middleware/validate';
import { loginSchema, signupSchema } from '../validations/auth.validation';

const authRouter = Router();

authRouter.post(
  '/sign-up',
  validate(signupSchema),
  authController.handleSignUp
);

authRouter.post('/login', validate(loginSchema), authController.handleLogin);

export default authRouter;
