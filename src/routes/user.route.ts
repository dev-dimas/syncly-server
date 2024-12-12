import { Router } from 'express';
import * as userController from '../controller/user.controller';
import imageUpload from 'src/middleware/image-upload';
import isAuth from 'src/middleware/is-auth';

const userRouter = Router();

userRouter.use(isAuth);

userRouter.get('/user', userController.handleGetUser);

userRouter.put(
  '/user',
  imageUpload.single('avatar'),
  userController.handleUpdateUser
);

export default userRouter;
