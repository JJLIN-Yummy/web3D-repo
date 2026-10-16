pipeline {
    agent any
    tools {
        nodejs 'node20'
    }
    stages {
        stage('安装依赖打包') {
            steps {
                sh '''
                    curl -v http://127.0.0.1:4873
                    export COREPACK_ENABLE_STRICT=0
                    export COREPACK_ENABLE_AUTO_PIN=0
                    export PNPM_FETCH_IGNORE_BUILDS=false
                    corepack disable
                    npm config set registry https://registry.npmmirror.com
                    npm install -g pnpm
                    pnpm config list
                    rm -rf node_modules
                    rm -rf pnpm-lock.yaml
                    pnpm install --force
                    pnpm run build:ci-demo
                '''
            }
        }
        stage('人工确认上线') {
            steps {
                input message: "确认上传 dist 到服务器 /web ？", ok: "确认上线"
            }
        }
        stage('上传 dist 文件') {
            steps {
                sshPublisher(
                    publishers: [
                        sshPublisherDesc(
                            configName: 'server-01',
                            transfers: [
                                sshTransfer(
                                    sourceFiles: 'packages/ci-demo/dist/**',
                                    remoteDirectory: '/web',
                                    cleanRemote: true,
                                    removePrefix: 'packages/ci-demo/dist'
                                )
                            ]
                        )
                    ]
                )
            }
        }
        stage('重载 Nginx') {
            steps {
                sshPublisher(
                    publishers: [
                        sshPublisherDesc(
                            configName: 'server-01',
                            transfers: [
                                sshTransfer(
                                    command: 'docker exec mynginx nginx -s reload'
                                )
                            ]
                        )
                    ]
                )
            }
        }
    }
    post {
        always {
            deleteDir()
            sh '''
                npm cache clean --force
                pnpm store prune
            '''
        }
        success {
            echo "✅ 部署完成！文件上传到 /web，mynginx 已重载"
        }
        failure {
            echo "❌ 流水线失败，查看日志"
        }
    }
    options {
        buildDiscarder(logRotator(numToKeepStr: '5'))
        timeout(time: 20, unit: 'MINUTES')
    }
}
