import { Router } from 'express';
import isAuth from 'src/middleware/is-auth';
import * as userController from '../controller/user.controller';

const userRouter = Router();

userRouter.use(isAuth);

userRouter.get('/user', userController.handleGetUser);

userRouter.put('/user', userController.handleUpdateUser);

export default userRouter;
