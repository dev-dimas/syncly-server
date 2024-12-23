import { Router } from 'express';
import isAuth from 'src/middleware/is-auth';
import * as userController from '../controller/user.controller';

const userRouter = Router();

userRouter.get('/user', isAuth, userController.handleGetUser);

userRouter.put('/user', isAuth, userController.handleUpdateUser);

export default userRouter;
