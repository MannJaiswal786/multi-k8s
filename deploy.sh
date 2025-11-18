docker build -t mannj99/multi-client:latest -t mannj99/multi-client:$SHA -f ./client/Dockerfile ./client
docker build -t mannj99/multi-server:latest -t mannj99/multi-server:$SHA -f ./server/Dockerfile ./server
docker build -t mannj99/multi-worker:latest -t mannj99/multi-worker:$SHA -f ./worker/Dockerfile ./worker
docker push mannj99/multi-client:latest
docker push mannj99/multi-server:latest
docker push mannj99/multi-worker:latest

docker push mannj99/multi-client:$SHA
docker push mannj99/multi-server:$SHA
docker push mannj99/multi-worker:$SHA
kubectl apply -f k8s
kubectl set image deployments/server-deployment server=mannj99/multi-server:$SHA
kubectl set image deployments/client-deployment client=mannj99/multi-client:$SHA
kubectl set image deployments/worker-deployment worker=mannj99/multi-worker:$SHA