package deployment

/*
----- This are the things are present in this file -----
GetDeploymentByName, GetWDSWorkloads
*/

import (
	"context"
	"github.com/kubestellar/ui/k8s"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/wds"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type WorkloadInfo struct {
	Name         string            `json:"name"`
	Kind         string            `json:"kind"` // 'Deployment' or 'Service'
	Namespace    string            `json:"namespace"`
	CreationTime time.Time         `json:"creationTime"`
	Labels       map[string]string `json:"labels"`
}

func GetDeploymentByName(c *gin.Context) {
	name := c.Param("name")
	namespace := c.Query("namespace")
	if namespace == "" {
		namespace = "default" // Use "default" namespace if not provided
	}

	clientset, err := wds.GetClientSetKubeConfig()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "failed to create Kubernetes clientset",
			"err":     err,
		})
		return
	}
	// deployment, err := clientset.AppsV1().Deployments(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	deployment, err := clientset.AppsV1().Deployments(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Deployment not found", "details": err.Error()})
		return
	}
	status := make(map[string]interface{})
	if deployment.Status.AvailableReplicas > 0 {
		status["availableReplicas"] = deployment.Status.AvailableReplicas
	}
	if deployment.Status.UnavailableReplicas > 0 {
		status["unavailableReplicas"] = deployment.Status.UnavailableReplicas
	}
	if len(deployment.Status.Conditions) > 0 {
		status["conditions"] = deployment.Status.Conditions
	}
	c.JSON(http.StatusOK, gin.H{
		"apiVersion": deployment.APIVersion,
		"kind":       deployment.Kind,
		"metadata":   deployment.ObjectMeta,
		"spec":       deployment.Spec,
		"status":     status,
	})
}

func GetWDSWorkloads(c *gin.Context) {
	cookieContext, err := c.Cookie("ui-wds-context")
	if err != nil {
		cookieContext = "wds1"
	}
	clientset, _, err := k8s.GetClientSetWithContext(cookieContext)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "failed to create Kubernetes clientset",
			"err":     err,
		})
		return
	}

	namespace := c.Query("namespace")
	if namespace == "" {
		namespace = "" // Use "" namespace if not provided (all deployment listed out)
	}

	// Get Deployments
	deployments, err := clientset.AppsV1().Deployments(namespace).List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Deployment not found", "details": err.Error()})
		return
	}

	// Get Services
	services, err := clientset.CoreV1().Services(namespace).List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Services not found", "details": err.Error()})
		return
	}

	var workloads []WorkloadInfo

	// Add deployments to workloads
	for _, deployment := range deployments.Items {
		workloads = append(workloads, WorkloadInfo{
			Name:         deployment.Name,
			Kind:         "Deployment",
			Namespace:    deployment.Namespace,
			CreationTime: deployment.CreationTimestamp.Time,
			Labels:       deployment.Labels,
		})
	}

	// Add services to workloads
	for _, service := range services.Items {
		workloads = append(workloads, WorkloadInfo{
			Name:         service.Name,
			Kind:         "Service",
			Namespace:    service.Namespace,
			CreationTime: service.CreationTimestamp.Time,
			Labels:       service.Labels,
		})
	}
	c.JSON(http.StatusOK, workloads)
}
