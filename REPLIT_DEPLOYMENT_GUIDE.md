# Deploying Learner_Bruh LMS on Replit

This guide provides step-by-step instructions for deploying your multi-tenant Learner_Bruh LMS application directly on Replit.

## Prerequisites

- Your Replit project is already set up and running
- You have a PostgreSQL database (using the built-in Replit Database)
- Your app is working properly in the Replit development environment

## Step 1: Prepare for Deployment

1. Verify your application is running correctly in development mode
2. Make sure all your dependencies are properly installed
3. Ensure your database is properly configured via the `DATABASE_URL` environment variable

## Step 2: Deploy Using Replit Deployments

1. Click the **Deploy** button in the top right corner of your Replit workspace
2. In the deployment dialog, configure the following:
   - **Name**: Choose a unique name for your deployment (e.g., learner-bruh-lms)
   - **Build Command**: `npm run build`
   - **Run Command**: `node dist/index.js`

3. Click **Deploy** to start the deployment process

Replit will automatically:
- Build your application
- Set up the necessary infrastructure
- Deploy your app to a `.replit.app` domain

## Step 3: Configure Environment Variables

After deployment, configure your environment variables:

1. Go to the **Secrets** tab in your Replit workspace (lock icon)
2. Add the following environment variables if they're not already set:
   - `DATABASE_URL`: Your PostgreSQL connection string (this should be already set)
   - `NODE_ENV`: Set to `production`

## Step 4: Multi-Tenancy

Your application already has a multi-tenant structure with:
- Instructor accounts act as separate tenants
- Students are assigned to a specific instructor during registration
- Strict data isolation between instructors and their students
- Each instructor can only manage their own courses and students

This architecture ensures:
1. A single deployment can serve multiple instructors
2. Each instructor has their own isolated environment
3. Students only see courses from their assigned instructor

## Step 5: Custom Domains (Optional)

For a more professional look:

1. In the Deployment settings, go to the **Domains** tab
2. Click **Add Domain**
3. Follow the instructions to set up a custom domain
4. Verify ownership and configure DNS settings

## Troubleshooting

If you encounter issues during deployment:

1. **Database Connection Issues**:
   - Check the application logs for connection errors
   - Verify your `DATABASE_URL` is correct in the Secrets tab
   - Make sure your database is running and accessible

2. **Build Failures**:
   - Look for errors in the build logs
   - Try running the build locally first: `npm run build`
   - Make sure all dependencies are installed

3. **Runtime Errors**:
   - Check the deployment logs
   - Verify environment variables are set correctly
   - If you see "Pretty-print" or related database errors, make sure the postgres.js driver is properly configured
   
## Additional Resources

- [Replit Deployments Documentation](https://docs.replit.com/hosting/deployments/overview)
- [PostgreSQL on Replit](https://docs.replit.com/hosting/databases/postgresql-on-replit)
- [Custom Domains on Replit](https://docs.replit.com/hosting/deployments/custom-domains)