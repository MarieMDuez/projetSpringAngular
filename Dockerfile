# Étape 1 : build du front Angular
FROM node:22-alpine AS front-build
WORKDIR /app/front
COPY gestion-budget-front/package*.json ./
RUN npm ci
COPY gestion-budget-front/ .
RUN npm run build -- --configuration=production

# Étape 2 : build du back Java avec les fichiers statiques du front intégrés
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY apirest/pom.xml .
# Les dépendances sont téléchargées dans une couche à part :
# elles ne sont retéléchargées que si le pom.xml change.
RUN mvn -B dependency:go-offline
COPY apirest/src ./src
# Le joker (*) évite de dépendre du nom exact du dossier dist/
COPY --from=front-build /app/front/dist/*/browser ./src/main/resources/static/
RUN mvn -B clean package -DskipTests

# Étape 3 : exécution du JAR autonome, sans les droits root
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S spring && adduser -S spring -G spring
COPY --from=build /app/target/*.jar app.jar
USER spring
EXPOSE 9000
ENTRYPOINT ["java", "-jar", "app.jar"]
