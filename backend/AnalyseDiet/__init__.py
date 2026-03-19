import logging
import os
import json
import io
from datetime import datetime

import azure.functions as func
import pandas as pd
import matplotlib
matplotlib.use("Agg")  # must be before importing pyplot
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np

from azure.storage.blob import BlobServiceClient

CONN_STR       = os.environ["AZURE_STORAGE_CONNECTION_STRING"]
DATA_CONTAINER = os.environ.get("BLOB_CONTAINER_NAME", "diets-data")
OUT_CONTAINER  = os.environ.get("OUTPUT_CONTAINER_NAME", "diets-output")
BLOB_FILE      = os.environ.get("BLOB_FILE_NAME", "All_Diets.csv")

def upload_chart(blob_service: BlobServiceClient, fig, blob_name: str) -> str:
    """Save a matplotlib figure to blob storage and return its URL."""
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight")
    buf.seek(0)
    blob_client = blob_service.get_blob_client(container=OUT_CONTAINER, blob=blob_name)
    blob_client.upload_blob(buf, overwrite=True, content_settings=None)
    plt.close(fig)
    return blob_client.url

def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info(f"AnalyseDiets function triggered at {datetime.now()}")

    try:
        # 1. connect to blob storage 
        blob_service = BlobServiceClient.from_connection_string(CONN_STR)

        # make sure output container exists
        try:
            blob_service.create_container(OUT_CONTAINER)
        except Exception:
            pass  # already exists

        # 2. load dataset from blob 
        logging.info(f"Reading {BLOB_FILE} from container {DATA_CONTAINER}")
        blob_client = blob_service.get_blob_client(container=DATA_CONTAINER, blob=BLOB_FILE)
        data = blob_client.download_blob().readall()
        df = pd.read_csv(io.BytesIO(data))
        logging.info(f"Dataset loaded: {df.shape}")

        #  3. data cleaning
        numeric_columns = ["Protein(g)", "Carbs(g)", "Fat(g)"]
        for col in numeric_columns:
            if df[col].isnull().any():
                df[col].fillna(df[col].mean(), inplace=True)

        # 4. analysis 
        avg_macros = df.groupby("Diet_type")[["Protein(g)", "Carbs(g)", "Fat(g)"]].mean()

        top_protein = (
            df.sort_values("Protein(g)", ascending=False)
            .groupby("Diet_type")
            .head(5)
        )

        highest_protein_diet  = avg_macros["Protein(g)"].idxmax()
        highest_protein_value = avg_macros["Protein(g)"].max()

        most_common_cuisines = df.groupby("Diet_type")["Cuisine_type"].agg(
            lambda x: x.mode()[0] if len(x.mode()) > 0 else "N/A"
        ).to_dict()

        df["Protein_to_Carbs_ratio"] = df["Protein(g)"] / df["Carbs(g)"].replace(0, np.nan)
        df["Carbs_to_Fat_ratio"]     = df["Carbs(g)"]   / df["Fat(g)"].replace(0, np.nan)

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        sns.set_style("whitegrid")

        # 5. chart 1 — average protein bar 
        fig1, ax1 = plt.subplots(figsize=(12, 6))
        sns.barplot(x=avg_macros.index, y=avg_macros["Protein(g)"], palette="viridis", ax=ax1)
        ax1.set_title(f"Average Protein by Diet Type - {timestamp}")
        ax1.set_xlabel("Diet Type")
        ax1.set_ylabel("Average Protein (g)")
        plt.xticks(rotation=45)
        plt.tight_layout()
        url1 = upload_chart(blob_service, fig1, "viz1_avg_protein_bar.png")

        # 6. chart 2 — all macronutrients bar 
        avg_macros_melted = avg_macros.reset_index().melt(
            id_vars="Diet_type",
            value_vars=["Protein(g)", "Carbs(g)", "Fat(g)"],
            var_name="Macronutrient",
            value_name="Average (g)",
        )
        fig2, ax2 = plt.subplots(figsize=(12, 6))
        sns.barplot(data=avg_macros_melted, x="Diet_type", y="Average (g)", hue="Macronutrient", palette="Set2", ax=ax2)
        ax2.set_title(f"Average Macronutrients by Diet Type - {timestamp}")
        ax2.set_xlabel("Diet Type")
        ax2.set_ylabel("Average (g)")
        plt.xticks(rotation=45)
        plt.tight_layout()
        url2 = upload_chart(blob_service, fig2, "viz2_all_macros_bar.png")

        # 7. chart 3 — heatmap 
        fig3, ax3 = plt.subplots(figsize=(12, 6))
        sns.heatmap(avg_macros, annot=True, fmt=".2f", cmap="YlOrRd", linewidths=0.5, ax=ax3)
        ax3.set_title(f"Macronutrient Heatmap - {timestamp}")
        plt.tight_layout()
        url3 = upload_chart(blob_service, fig3, "viz3_heatmap_macros.png")

        # 8. build response
        response = {
            "status": "success",
            "executionTime": str(datetime.now()),
            "summary": {
                "totalRecipes":        int(len(df)),
                "dietTypes":           list(avg_macros.index),
                "highestProteinDiet":  highest_protein_diet,
                "highestProteinValue": round(float(highest_protein_value), 2),
                "mostCommonCuisines":  most_common_cuisines,
            },
            "charts": {
                "avgProteinBar":   url1,
                "allMacrosBar":    url2,
                "macroHeatmap":    url3,
            },
            "chartData": {
                "avgProtein": {
                    "labels": list(avg_macros.index),
                    "values": [round(float(v), 2) for v in avg_macros["Protein(g)"]],
                },
                "avgCarbs": {
                    "labels": list(avg_macros.index),
                    "values": [round(float(v), 2) for v in avg_macros["Carbs(g)"]],
                },
                "avgFat": {
                    "labels": list(avg_macros.index),
                    "values": [round(float(v), 2) for v in avg_macros["Fat(g)"]],
                },
            },
        }

        return func.HttpResponse(
            body=json.dumps(response),
            mimetype="application/json",
            status_code=200,
            headers={
                "Access-Control-Allow-Origin":  "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            }
        )

    except Exception as e:
        logging.error(f"Function failed: {e}")
        return func.HttpResponse(
            body=json.dumps({"status": "error", "message": str(e)}),
            mimetype="application/json",
            status_code=500,
            headers={"Access-Control-Allow-Origin": "*"}
        )