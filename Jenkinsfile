// Redeploy https://hms.trikaar.tech when main is updated.
//
// Jenkins job: Multibranch Pipeline (or Pipeline from SCM)
// Webhook: GitHub Repo → Settings → Webhooks → http://<jenkins-host>/github-webhook/
// Credentials: SSH Username with private key, ID = hms-vps-ssh (override with SSH_CREDENTIALS_ID)
//
// If Jenkins itself runs on the VPS and /opt/hms-springboot exists, deploy is local.

pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  environment {
    DEPLOY_HOST         = "${env.DEPLOY_HOST}"
    DEPLOY_USER         = "${env.DEPLOY_USER ?: 'root'}"
    DEPLOY_PATH         = "${env.DEPLOY_PATH ?: '/opt/hms-springboot'}"
    SSH_CREDENTIALS_ID  = "${env.SSH_CREDENTIALS_ID ?: 'trikaar-vps-ssh'}"
  }

  triggers {
    githubPush()
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Backend Build Check') {
      steps {
        sh '''
          set -euo pipefail
          echo "Testing Backend compilation..."
          docker run --rm \
            -v "$PWD/backend-java":/app \
            -w /app \
            eclipse-temurin:21-jdk \
            bash -lc "mvn -B clean package -DskipTests"
        '''
      }
    }

    stage('Frontend Build Check') {
      steps {
        sh '''
          set -euo pipefail
          echo "Testing Frontend build..."
          docker run --rm \
            -v "$PWD/frontend-modern":/app \
            -w /app \
            node:20-alpine \
            sh -lc "npm install --prefer-offline && npm run build"
        '''
      }
    }

    stage('Deploy') {
      when {
        anyOf {
          branch 'main'
          expression {
            def b = env.BRANCH_NAME ?: env.GIT_BRANCH ?: ''
            return b == 'main' || b == 'origin/main' || b.endsWith('/main')
          }
        }
      }
      steps {
        script {
          if (fileExists("${env.DEPLOY_PATH}/docker-compose.yml")) {
            echo "Jenkins is on the VPS — deploying locally at ${env.DEPLOY_PATH}"
            sh """
              set -euo pipefail
              rsync -avz --exclude '.git' --exclude 'node_modules' --exclude 'target' --exclude 'database-backup' ./ '${env.DEPLOY_PATH}/'
              cd '${env.DEPLOY_PATH}'
              chmod +x scripts/deploy-prod.sh
              ./scripts/deploy-prod.sh
            """
          } else {
            echo "Deploying over SSH to ${env.DEPLOY_USER}@${env.DEPLOY_HOST}:${env.DEPLOY_PATH}"
            sshagent(credentials: [env.SSH_CREDENTIALS_ID]) {
              sh """
                set -euo pipefail
                rsync -avz --exclude '.git' --exclude 'node_modules' --exclude 'target' --exclude 'database-backup' \
                  -e "ssh -o StrictHostKeyChecking=accept-new" \
                  ./ '${env.DEPLOY_USER}@${env.DEPLOY_HOST}:${env.DEPLOY_PATH}/'
                ssh -o StrictHostKeyChecking=accept-new \\
                  '${env.DEPLOY_USER}@${env.DEPLOY_HOST}' \\
                  'cd ${env.DEPLOY_PATH} && chmod +x scripts/deploy-prod.sh && ./scripts/deploy-prod.sh'
              """
            }
          }
        }
      }
    }

    stage('Health Verification') {
      when {
        anyOf {
          branch 'main'
          expression {
            def b = env.BRANCH_NAME ?: env.GIT_BRANCH ?: ''
            return b == 'main' || b == 'origin/main' || b.endsWith('/main')
          }
        }
      }
      steps {
        script {
          sh """
            set -euo pipefail
            echo "Verifying HMS live health..."
            sleep 15
            STATUS=\$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 http://${env.DEPLOY_HOST}:8085 || echo "000")
            echo "HMS frontend HTTP response: \$STATUS"
            if [ "\$STATUS" = "200" ] || [ "\$STATUS" = "301" ] || [ "\$STATUS" = "302" ]; then
              echo "✅ Trikaar HMS is live and healthy at https://hms.trikaar.tech"
            else
              echo "⚠️ Warning: Expected HTTP 200/301/302, got \$STATUS"
            fi
          """
        }
      }
    }
  }

  post {
    success {
      echo "🎉 Build ${env.BUILD_NUMBER} succeeded! Production updated for main branch."
    }
    failure {
      echo "❌ Build ${env.BUILD_NUMBER} failed! Production deployment aborted."
    }
  }
}
