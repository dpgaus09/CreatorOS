# Deploying Learner_Bruh LMS on Replit

This guide provides step-by-step instructions for deploying your multi-tenant Learner_Bruh LMS application directly on Replit.

## Prerequisites

- Your Replit project is already set up and running
- You have a PostgreSQL database (either the built-in Replit Database or an external one like Neon Database)
- Your app is working properly in the Replit development environment

## Step 1: Prepare for Deployment

1. Verify your application is running correctly in development mode
2. Make sure all your dependencies are properly installed
3. Ensure your database is properly configured

## Step 2: Deploy Using Replit Deployments

1. Click the **Deploy** button in the top right corner of your Replit workspace
2. In the deployment dialog, configure the following:
   - **Name**: Choose a unique name for your deployment
   - **Deployment Target**: Select "Cloud Run"
   - **Build Command**: `npm run build`
   - **Run Command**: `node dist/index.js`
   - **Public Directory**: `dist/public` (for static assets)

3. Click **Deploy** to start the deployment process

Replit will automatically:
- Build your application
- Set up the necessary infrastructure
- Deploy your app to a `.replit.app` domain

## Step 3: Configure Environment Variables

After deployment, configure your environment variables:

1. Go to the **Deployment** tab in your Replit workspace
2. Click on your deployment
3. Go to the **Secrets** tab
4. Add the following environment variables:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `NODE_ENV`: Set to `production`
   - `PORT`: Set to `3000`
   - `HOST`: Set to `0.0.0.0`

## Step 4: Set Up Multi-Tenancy

Your current application already has a basic multi-tenant structure with:
- Instructor accounts can create courses
- Students enroll in specific instructor courses
- Permissions are enforced based on roles

This approach means:
1. A single deployment can serve multiple instructors
2. Each instructor manages their own content
3. Students only see courses they're enrolled in

## Step 5: Custom Domains (Optional)

For a more professional look:

1. In the Deployment settings, go to the **Domains** tab
2. Click **Add Domain**
3. Follow the instructions to set up a custom domain
4. Verify ownership and configure DNS settings

## Troubleshooting

If you encounter issues during deployment:

1. **Database Connection Issues**:
   - Verify your `DATABASE_URL` is correct
   - Ensure your IP is whitelisted if using an external database
   - Check that your database user has proper permissions

2. **Build Failures**:
   - Look for errors in the build logs
   - Try running the build locally first: `npm run build`
   - Make sure all dependencies are installed

3. **Runtime Errors**:
   - Check the deployment logs
   - Verify environment variables are set correctly
   - Ensure your Node.js version is compatible
   
## Additional Resources

- [Replit Deployments Documentation](https://docs.replit.com/hosting/deployments/overview)
- [PostgreSQL on Replit](https://docs.replit.com/hosting/databases/postgresql-on-replit)
- [Custom Domains on Replit](https://docs.replit.com/hosting/deployments/custom-domains)