import router from '../router';
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Cluster } from '../../models';
import { IError } from '../../interfaces/IError';
// import { jwtVerify } from '../../warehouse/middlewares';
import { verifyCookie } from '../../warehouse/middlewares';
import { terminal } from '../../services/terminal';

/* GETTING SPECIFIC CLUSTER USING CLUSTERNAME:
  VERIFIES USER's TOKEN, FINDS CLUSTER IN DB. IF CLUSTER EXISTS, SEND CLUSTER DETAILS TO THE CLIENT. ELSE THROW ERROR
*/
router
  .route('/cluster::name')
  .get(verifyCookie, async (req: Request, res: Response) => {
    terminal(
      `Received ${req.method} request at terminal '${req.baseUrl}${req.url}' endpoint`
    );
    try {
      const response = await Cluster.find({ name: req.params['name'] }).exec();
      if (response.length === 0) {
        const error: IError = {
          status: 401,
          message: `Fail: Cluster [${req.params['name']}] does not exist`,
        };
        terminal(`Fail: ${error.message}`);
        return res.status(error.status).json(error);
      }
      terminal(
        `Success: Cluster [${req.params['name']}] document retrieved from MongoDB collection`
      );
      return res.status(200).json(response[0]);
    } catch (err) {
      const error: IError = {
        status: 500,
        message: `Unable to fulfill ${req.method} request: ${err}`,
      };
      terminal(`Fail: ${error.message}`);
      return res.status(error.status).json(error);
    }
  });
router
  .route('/cluster')
  /* GETTING ALL CLUSTERS:
    VERIFIES USER's TOKEN, FETCHES ALL CLUSTERS IN DB. IF CLUSTERS EXISTS, SEND CLUSTERS TO THE CLIENT. ELSE THROW ERROR
  */
  .get(verifyCookie, async (req: Request, res: Response) => {
    terminal(
      `Received ${req.method} request at terminal '${req.baseUrl}${req.url}' endpoint`
    );
    try {
      if (res.locals.error)
        return res.status(res.locals.error.status).json(res.locals.error);
      const clusters = await Cluster.find({}).exec();
      if (clusters.length === 0) {
        const error: IError = {
          status: 401,
          message: `Fail: No cluster data exists`,
        };
        return res.status(error.status).json(error);
      }
      terminal(
        `Success: All cluster documents retrieved from MongoDB collection`
      );
      // console.log(clusters, 'clusters');
      return res.status(200).json(clusters);
    } catch (err) {
      const error: IError = {
        status: 500,
        message: `Unable to fulfill ${req.method} request: ${err}`,
      };
      terminal(`Fail: ${error.message}`);
      return res.status(error.status).json(error);
    }
  })
  /* CREATING A NEW CLUSTER:
    VERIFIES USER's TOKEN, VALIDATES USER INPUTS, ENCODES FAAS CREDENTIALS AS AUTHORIZATION, 
    SAVES CLUSTER DETAILS TO DB AND SENDS SUCCESS TO USER
  */
  .post(verifyCookie, async (req: Request, res: Response) => {
    terminal(
      `Received ${req.method} request at terminal '${req.baseUrl}${req.url}' endpoint`
    );
    // Validate request body
    if (
      !req.body.url ||
      !req.body.k8_port ||
      !req.body.faas_port ||
      !req.body.faas_username ||
      !req.body.faas_password ||
      !req.body.name ||
      !req.body.description
    ) {
      const error: IError = {
        status: 500,
        message: 'Unable to fulfill request without all fields completed',
      };
      terminal(`Fail: ${error.message}`);
      return res.status(error.status).json(error);
    }
    try {
      const {
        url,
        k8_port,
        faas_port,
        faas_username,
        faas_password,
        name,
        description,
      } = req.body;
      terminal(`Searching for cluster [${name}] in MongoDB`);
      const cluster = await Cluster.find({ name: name }).exec();
      terminal(`Success: MongoDB query executed [${name}]`);
      if (cluster[0]) {
        const error: IError = {
          status: 401,
          message: `Cluster [${cluster[0].name}] already exists`,
          exists: true,
        };
        terminal(`Fail: ${error.message}`);
        return res.status(error.status).json(error);
      }
      const clusterId = new Types.ObjectId();
      const encodeAuth = Buffer.from(
        `${faas_username}:${faas_password}`
      ).toString('base64');
      const authorization = `Basic ${encodeAuth}`;
      const attempt = new Cluster({
        _id: clusterId,
        url,
        k8_port,
        faas_port,
        authorization,
        name,
        description,
        favorite: [],
      });
      await attempt.save();
      terminal(
        `Success: New cluster [${clusterId}] stored in MongoDB collection`
      );
      return res.status(201).json({ success: true });
    } catch (err) {
      const error: IError = {
        status: 500,
        message: `Unable to fulfill ${req.method} request: ${err}`,
      };
      terminal(`Fail: ${error.message}`);
      return res.status(error.status).json(error);
    }
  })
  /* UPDATING A CLUSTER:
  VERIFIES USER's TOKEN, VALIDATES CLUSTER ID AND FAAS DETAILS, ENCODES FAAS CREDENTIALS AS AUTHORIZATION, 
  CHECKS AND THROWS ERROR IF CLUSTER DOES NOT EXIST IN DB. OTHERWISE, UPDATES THE CLUSTER WITH DETAILS FROM REQUEST BODY
  */
  .put(verifyCookie, async (req: Request, res: Response) => {
    terminal(
      `Received ${req.method} request at terminal '${req.baseUrl}${req.url}' endpoint`
    );
    // Validate request body
    if (!req.body.clusterId) {
      const error: IError = {
        status: 500,
        message: 'Unable to fulfill request without clusterId',
      };
      terminal(`Fail: ${error.message}`);
      return res.status(error.status).json(error);
    }
    if (
      (req.body.faas_username && !req.body.faas_password) ||
      (req.body.faas_password && !req.body.faas_username)
    ) {
      const error: IError = {
        status: 500,
        message:
          'Unable to fulfill request without both OpenFaaS credentials, username and password',
      };
      terminal(`Fail: ${error.message}`);
      return res.status(error.status).json(error);
    }
    try {
      const {
        clusterId,
        url,
        k8_port,
        faas_port,
        faas_username,
        faas_password,
        name,
        description,
      } = req.body;
      const {
        jwt: { id },
      } = res.locals;
      // Check to see if cluster exists
      terminal(`Searching for cluster [${name}] in MongoDB`);
      const cluster = await Cluster.find({ _id: clusterId }).exec();
      terminal(`Success: MongoDB query executed [${name}]`);
      if (cluster.length === 0) {
        const error: IError = {
          status: 401,
          message: `Fail: Cluster [${name}] does not exist`,
          exists: false,
        };
        terminal(`Fail: ${error.message}`);
        return res.status(error.status).json(error);
      }
      let authorization;
      if (faas_username && faas_password) {
        const encodeAuth = Buffer.from(
          `${faas_username}:${faas_password}`
        ).toString('base64');
        authorization = `Basic ${encodeAuth}`;
      }
      switch (req.body.favorite) {
        case true: {
          await Cluster.updateOne(
            { _id: clusterId },
            {
              url: url,
              k8_port: k8_port,
              faas_port: faas_port,
              authorization: authorization,
              name: name,
              description: description,
              $push: { favorite: id },
            }
          );
          terminal(
            `Success: Cluster [${req.body.clusterId}] added to favorites`
          );
          return res.status(201).json({ success: true });
        }
        case false: {
          await Cluster.updateOne(
            { _id: clusterId },
            {
              url: url,
              k8_port: k8_port,
              faas_port: faas_port,
              authorization: authorization,
              name: name,
              description: description,
              $pull: { favorite: id },
            }
          );
          terminal(
            `Success: Cluster [${req.body.clusterId}] removed from favorites`
          );
          return res.status(201).json({ success: true });
        }
        case undefined: {
          await Cluster.updateOne(
            { _id: clusterId },
            {
              url: url,
              k8_port: k8_port,
              faas_port: faas_port,
              authorization: authorization,
              name: name,
              description: description,
            }
          );
          terminal(`Success: Cluster [${req.body.clusterId}] document updated`);
          return res.status(201).json({ success: true });
        }
      }
    } catch (err) {
      const error: IError = {
        status: 500,
        message: `Unable to fulfill ${req.method} request: ${err}`,
      };
      terminal(`Fail: ${error.message}`);
      return res.status(error.status).json(error);
    }
  })
  /* DELETING A CLUSTER:
  VERIFIES USER's TOKEN, VALIDATES CLUSTER ID, DELETES CLUSTER FROM DB USING CLUSTER ID AND SENDS DELETED STATUS TO THE CLIENT. 
  THROWS ERROR IF NO CLUSTER IS DELETED.
  */
  .delete(verifyCookie, async (req: Request, res: Response) => {
    terminal(
      `Received ${req.method} request at terminal '${req.baseUrl}${req.url}' endpoint`
    );
    // Validate request body
    if (!req.body.clusterId) {
      const error: IError = {
        status: 500,
        message: 'Unable to fulfill request without clusterId',
      };
      terminal(`Fail: ${error.message}`);
      return res.status(error.status).json(error);
    }
    try {
      const response = await Cluster.deleteOne({ _id: req.body.clusterId });
      if (response.deletedCount === 0) {
        const error: IError = {
          status: 401,
          message: `Fail: Cluster [${req.body.clusterId}] either does not exist or could not be deleted`,
        };
        terminal(`Fail: ${error.message}`);
        return res.status(error.status).json({ error });
      }
      terminal(
        `Success: Cluster [${req.body.clusterId}] deleted from MongoDB collection`
      );
      return res.status(200).json({ deleted: true });
    } catch (err) {
      const error: IError = {
        status: 500,
        message: `Unable to fulfill ${req.method} request: ${err}`,
      };
      terminal(`Fail: ${error.message}`);
      return res.status(error.status).json(error);
    }
  });

export default router;
