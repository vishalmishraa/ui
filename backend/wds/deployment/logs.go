package deployment

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"github.com/kubestellar/ui/wds"
	v1 "k8s.io/api/apps/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/cache"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type DeploymentUpdate struct {
	Timestamp string `json:"timestamp"`
	Message   string `json:"message"`
}

func HandleDeploymentLogs(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket Upgrade Error:", err)
		return
	}
	defer conn.Close()

	namespace := r.URL.Query().Get("namespace")
	deploymentName := r.URL.Query().Get("deployment")

	if namespace == "" || deploymentName == "" {
		if err := conn.WriteMessage(websocket.TextMessage, []byte("Error: Missing namespace or deployment name")); err != nil {
			log.Printf("Failed to write message: %v", err)
		}
		return
	}

	clientset, err := wds.GetClientSetKubeConfig()
	if err != nil {
		if err := conn.WriteMessage(websocket.TextMessage, []byte("Error: Failed to create Kubernetes clientset - "+err.Error())); err != nil {
			log.Printf("Failed to send WebSocket message: %v", err)
		}
		return
	}

	sendInitialLogs(conn, clientset, namespace, deploymentName)

	// Use an informer to watch the deployment
	watchDeploymentWithInformer(conn, clientset, namespace, deploymentName)

	// WE ARE USING INFORMER
	//watchDeploymentChanges(conn, clientset, namespace, deploymentName)
}

func sendInitialLogs(conn *websocket.Conn, clientset *kubernetes.Clientset, namespace, deploymentName string) {
	deployment, err := clientset.AppsV1().Deployments(namespace).Get(context.Background(), deploymentName, metav1.GetOptions{})
	if err != nil {
		if err := conn.WriteMessage(websocket.TextMessage, []byte("Error: Failed to fetch deployment - "+err.Error())); err != nil {
			log.Printf("Failed to send WebSocket message: %v", err)
		}
		return
	}

	logs := getDeploymentLogs(deployment)
	for _, logLine := range logs {
		if err := conn.WriteMessage(websocket.TextMessage, []byte(logLine)); err != nil {
			log.Println("Error writing to WebSocket:", err)
			return
		}
		time.Sleep(200 * time.Millisecond)
	}
}

func watchDeploymentWithInformer(conn *websocket.Conn, clientset *kubernetes.Clientset, namespace, deploymentName string) {
	factory := informers.NewSharedInformerFactoryWithOptions(clientset, 0,
		informers.WithNamespace(namespace),
		informers.WithTweakListOptions(func(options *metav1.ListOptions) {
			options.FieldSelector = fmt.Sprintf("metadata.name=%s", deploymentName)
		}),
	)
	informer := factory.Apps().V1().Deployments().Informer()

	informer.AddEventHandler(cache.ResourceEventHandlerFuncs{
		UpdateFunc: func(oldObj, newObj interface{}) {
			oldDeployment, ok1 := oldObj.(*v1.Deployment)
			newDeployment, ok2 := newObj.(*v1.Deployment)
			if !ok1 || !ok2 || newDeployment.Name != deploymentName {
				return
			}
			updateHandler(conn, oldDeployment, newDeployment)
		},
	})
	stopCh := make(chan struct{})
	defer close(stopCh)

	go informer.Run(stopCh)

	// Keep the connection open
	select {}
}

func updateHandler(conn *websocket.Conn, oldDeployment, newDeployment *v1.Deployment) {
	var logs []DeploymentUpdate
	if *oldDeployment.Spec.Replicas != *newDeployment.Spec.Replicas {
		logs = append(logs, DeploymentUpdate{
			Timestamp: time.Now().Format(time.RFC3339),
			Message:   fmt.Sprintf("Deployment %s updated - Replicas changed: %d", newDeployment.Name, *newDeployment.Spec.Replicas),
		})
	}
	oldImage := oldDeployment.Spec.Template.Spec.Containers[0].Image
	newImage := newDeployment.Spec.Template.Spec.Containers[0].Image
	if oldImage != newImage {
		logs = append(logs, DeploymentUpdate{
			Timestamp: time.Now().Format(time.RFC3339),
			Message:   fmt.Sprintf("Deployment %s updated - Image changed: %s", newDeployment.Name, newImage),
		})
	}
	for _, logLine := range logs {
		jsonMessage, _ := json.Marshal(logLine)
		err := conn.WriteMessage(websocket.TextMessage, jsonMessage)
		if err != nil {
			log.Printf("failed to write WebSocket message: %v", err)
		}
	}
}

func getDeploymentLogs(deployment *v1.Deployment) []string {
	baseTime := time.Now().Format(time.RFC3339)

	replicas := int32(1)
	if deployment.Spec.Replicas != nil {
		replicas = *deployment.Spec.Replicas
	}

	logs := []string{
		fmt.Sprintf("[%v] INFO: Deployment workload %v initiated ", baseTime, deployment.Name),
		fmt.Sprintf("[%v] INFO: Workload created with replicas: %d, image: %v ", baseTime, replicas, deployment.Spec.Template.Spec.Containers[0].Image),
		fmt.Sprintf("[%v] INFO: Namespace %v successfully updated  ", baseTime, deployment.Namespace),
		fmt.Sprintf("[%v] INFO: Available Replicas: %d ", baseTime, deployment.Status.AvailableReplicas),
	}

	// Check if Conditions slice has elements before accessing it
	if len(deployment.Status.Conditions) > 0 {
		condition := deployment.Status.Conditions[0]
		logs = append(logs,
			fmt.Sprintf("[%v] INFO: Conditions: %s ", baseTime, condition.Type),
			fmt.Sprintf("[%v] INFO: LastUpdateTime : %s ", baseTime, condition.LastUpdateTime.Time),
			fmt.Sprintf("[%v] INFO: LastTransitionTime : %s ", baseTime, condition.LastTransitionTime.Time),
			fmt.Sprintf("[%v] INFO: Message: %s ", baseTime, condition.Message),
		)
	} else {
		logs = append(logs, fmt.Sprintf("[%v] INFO: No conditions available", baseTime))
	}

	return logs
}
