package main

import (
	"fmt"
	"net/http"
	"os"

	"context"

	"github.com/gin-gonic/gin"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

func main() {
	router := gin.Default()

	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	router.GET("/api/clusters", func(c *gin.Context) {
		contexts, clusters, currentContext, err, itsData := getKubeInfo()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"contexts":       contexts,
			"clusters":       clusters,
			"currentContext": currentContext,
			"itsData":        itsData,
		})
	})

	router.Run(":4000")
}

type ContextInfo struct {
	Name    string `json:"name"`
	Cluster string `json:"cluster"`
}

func getKubeInfo() ([]ContextInfo, []string, string, error, gin.H) {
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		if home := homeDir(); home != "" {
			kubeconfig = fmt.Sprintf("%s/.kube/config", home)
		}
	}

	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		return nil, nil, "", err, nil
	}

	var contexts []ContextInfo
	clusterSet := make(map[string]bool) // Use map to track unique clusters

	// Get contexts and their associated clusters
	for contextName, context := range config.Contexts {
		contexts = append(contexts, ContextInfo{
			Name:    contextName,
			Cluster: context.Cluster,
		})
		clusterSet[context.Cluster] = true
	}

	// Convert unique clusters to slice
	var clusters []string
	for clusterName := range clusterSet {
		clusters = append(clusters, clusterName)
	}
	test, err := getITSInfo()
	if err != nil {
		fmt.Printf("ITS error: %v\n", err) // Debug print
		// Don't return error, continue with other data
	}
	fmt.Println(test)
	return contexts, clusters, config.CurrentContext, nil, gin.H{
		"contexts": contexts,
		"clusters": clusters,
		"currentContext": config.CurrentContext,
		"itsData": test,
	}
}

func getITSInfo() (string, error) {
	// Use the same kubeconfig path logic as getKubeInfo
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		if home := homeDir(); home != "" {
			kubeconfig = fmt.Sprintf("%s/.kube/config", home)
		}
	}

	config, err := clientcmd.BuildConfigFromFlags("", kubeconfig) // Use kubeconfig path instead of empty string
	if err != nil {
		return "", err
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return "", err
	}

	// Modified REST API path - this was likely incorrect
	clusters, err := clientset.RESTClient().Get().
		AbsPath("/apis/cluster.open-cluster-management.io/v1"). // Use the correct API group
		Resource("managedclusters").                            // Just the resource, no namespace needed
		DoRaw(context.TODO())
	if err != nil {
		fmt.Printf("REST client error: %v\n", err) // Debug print
		return "", fmt.Errorf("failed to get managed clusters: %w", err)
	}

	return string(clusters), nil
}

func homeDir() string {
	if h := os.Getenv("HOME"); h != "" {
		return h
	}
	return os.Getenv("USERPROFILE") // windows
}
