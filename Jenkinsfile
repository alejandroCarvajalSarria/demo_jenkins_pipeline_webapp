pipeline {
  agent any
  options { timestamps() }
  environment {
    AWS_REGION      = 'eu-west-1'    // already created in Jenkins
    TARGET_INSTANCE = credentials('target-ec2-id')  // already created in Jenkins
    ECR_REPO        = 'demo-webapp'                 // <-- set to your ECR repo name
  }
  stages {
    stage('Checkout') { steps { checkout scm } }

    stage('Build image') {
        steps {
            sh '''
            set -eux
            docker buildx create --use --name jx || true
            docker buildx inspect --bootstrap
            docker buildx build --platform linux/amd64 \
                -t ${ECR_REPO}:${GIT_COMMIT} \
                --load .
            '''
        }
    }

    stage('Push to ECR') {
      steps {
        sh '''
          set -eux
          ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
          aws ecr get-login-password --region "$AWS_REGION" \
            | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

          docker tag ${ECR_REPO}:${GIT_COMMIT} ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:${GIT_COMMIT}
          docker tag ${ECR_REPO}:${GIT_COMMIT} ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:latest

          docker push ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:${GIT_COMMIT}
          docker push ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:latest
        '''
      }
    }

    stage('Deploy to EC2 via SSM') {
      steps {
        sh '''
          set -eux
          ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
          IMAGE="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:${GIT_COMMIT}"

          aws ssm send-command \
            --instance-ids "$TARGET_INSTANCE" \
            --document-name "AWS-RunShellScript" \
            --parameters '{"commands":[
              "set -eux",
              "aws ecr get-login-password --region '"$AWS_REGION"' | docker login --username AWS --password-stdin '"$ACCOUNT_ID"'.dkr.ecr.'"$AWS_REGION"'.amazonaws.com",
              "docker rm -f app || true",
              "docker pull '"$IMAGE"'",
              "docker run -d --name app -p 80:3000 --restart always '"$IMAGE"'"
            ]}' \
            --region "$AWS_REGION"
        '''
      }
    }
  }
}
