uniform float ambientIntensity;
uniform vec3 diffuseColor;
uniform vec3 emissiveColor;
uniform float shininess;
uniform vec3 specularColor;
uniform float opacity;
uniform mat4 viewMatrix;
uniform bool useVertexColor;
uniform vec3 coords;
#if HAS_EMISSIVETEXTURE
uniform sampler2D emissiveTexture;
#endif
#if HAS_DIFFUSETEXTURE
uniform sampler2D diffuseTexture;
#endif
#if HAS_SPECULARTEXTURE
uniform sampler2D specularTexture;
#endif

varying vec3 fragNormal;
varying vec3 fragVertexPosition;
varying vec3 fragEyeVector;
varying vec2 fragTexCoord;
varying vec3 fragVertexColor;

#if (HAS_POINTLIGHT_SHADOWMAPS || HAS_DIRECTIONALLIGHT_SHADOWMAPS || HAS_SPOTLIGHT_SHADOWMAPS)
    varying vec3 fragWorldPosition;  //if there is Shadow we need world position and unpacking function
    float unpackDepth( const in vec4 rgba_depth ) {
      const vec4 bit_shift = vec4( 1.0 / ( 256.0 * 256.0 * 256.0 ), 1.0 / ( 256.0 * 256.0 ), 1.0 / 256.0, 1.0 );
      float depth = dot( rgba_depth, bit_shift );
      return depth;
    }
#endif

#if MAX_POINTLIGHTS > 0
uniform vec3 pointLightAttenuation[MAX_POINTLIGHTS];
uniform vec3 pointLightPosition[MAX_POINTLIGHTS];
uniform vec3 pointLightIntensity[MAX_POINTLIGHTS];
uniform bool pointLightOn[MAX_POINTLIGHTS];
uniform bool pointLightCastShadow[MAX_POINTLIGHTS];
#if HAS_POINTLIGHT_SHADOWMAPS
uniform samplerCube pointLightShadowMap[MAX_POINTLIGHTS];
uniform float pointLightShadowBias[MAX_POINTLIGHTS];
uniform vec2 pointLightNearFar[MAX_POINTLIGHTS];
float vecToDepth(vec3 vec, float n, float f){
vec3 absVec = abs(vec);
float maxComp = max(absVec.x, max(absVec.y, absVec.z));
float res = (f+n)/(f-n)-(2.0*f*n)/(f-n)/maxComp;
return res*0.5+0.5;
}
#endif
#endif
#if MAX_SPOTLIGHTS > 0
uniform vec3 spotLightAttenuation[MAX_SPOTLIGHTS];
uniform vec3 spotLightPosition[MAX_SPOTLIGHTS];
uniform vec3 spotLightIntensity[MAX_SPOTLIGHTS];
uniform bool spotLightOn[MAX_SPOTLIGHTS];
uniform vec3 spotLightDirection[MAX_SPOTLIGHTS];
uniform float spotLightCosCutoffAngle[MAX_SPOTLIGHTS];
uniform float spotLightCosSoftCutoffAngle[MAX_SPOTLIGHTS];
uniform float spotLightSoftness[MAX_SPOTLIGHTS];
uniform bool spotLightCastShadow[MAX_SPOTLIGHTS];
#if HAS_SPOTLIGHT_SHADOWMAPS
uniform mat4 spotLightMatrix[ MAX_SPOTLIGHTS ];//used for shadowmapcoord calculation
uniform sampler2D spotLightShadowMap[MAX_SPOTLIGHTS];
uniform float spotLightShadowBias[MAX_SPOTLIGHTS];
#endif
#endif
#if MAX_DIRECTIONALLIGHTS > 0
uniform vec3 directionalLightDirection[MAX_DIRECTIONALLIGHTS];
uniform vec3 directionalLightIntensity[MAX_DIRECTIONALLIGHTS];
uniform bool directionalLightOn[MAX_DIRECTIONALLIGHTS];
uniform bool directionalLightCastShadow[MAX_DIRECTIONALLIGHTS];
#if HAS_DIRECTIONALLIGHT_SHADOWMAPS
uniform mat4 directionalLightMatrix[MAX_DIRECTIONALLIGHTS];
uniform sampler2D directionalLightShadowMap[MAX_DIRECTIONALLIGHTS];
uniform float directionalLightShadowBias[MAX_DIRECTIONALLIGHTS];
#endif
#endif
uniform sampler2D ssaoMap;
void main(void) {
#if MAX_POINTLIGHTS > 0 && HAS_POINTLIGHT_SHADOWMAPS
    vec3 pointLightShadowMapDirection[MAX_POINTLIGHTS];
    for(int i = 0; i < MAX_POINTLIGHTS; i++) {
       pointLightShadowMapDirection[i] = fragWorldPosition - pointLightPosition[i];
    }
#endif
#if MAX_SPOTLIGHTS > 0 && HAS_SPOTLIGHT_SHADOWMAPS
    vec4 spotLightShadowMapCoord[MAX_SPOTLIGHTS];
    for(int i = 0; i < MAX_SPOTLIGHTS; i++) {
      spotLightShadowMapCoord[i] = spotLightMatrix[i] * vec4(fragWorldPosition, 1.0);
    }
#endif
#if MAX_DIRECTIONALLIGHTS > 0 && HAS_DIRECTIONALLIGHT_SHADOWMAPS
    vec4 directionalLightShadowMapCoord[MAX_DIRECTIONALLIGHTS];
    for(int i = 0; i < MAX_DIRECTIONALLIGHTS; i++) {
      directionalLightShadowMapCoord[i] = directionalLightMatrix[i] * vec4(fragWorldPosition, 1.0);
    }
#endif
  float alpha =  max(0.0, opacity);
  vec3 objDiffuse = diffuseColor;
  if(useVertexColor)
    objDiffuse *= fragVertexColor;
  #if HAS_DIFFUSETEXTURE
    vec4 texDiffuse = texture2D(diffuseTexture, fragTexCoord);
    alpha *= texDiffuse.a;
    objDiffuse *= texDiffuse.rgb;
  #endif
  if (alpha < 0.05) discard;
  #if HAS_EMISSIVETEXTURE
    vec3 color = emissiveColor * texture2D(emissiveTexture, fragTexCoord).rgb + (ambientIntensity * objDiffuse);
  #else
    vec3 color = emissiveColor + (ambientIntensity * objDiffuse);
  #endif
  vec3 objSpecular = specularColor;
  #if HAS_SPECULARTEXTURE
    objSpecular = objSpecular * texture2D(specularTexture, fragTexCoord).rgb;
  #endif
  #if HAS_SSAOMAP
	 float ssao = 1.0 - texture2D(ssaoMap, gl_FragCoord.xy / coords.xy).r;
  #endif
  float shadowInfluence = 0.0; //used for sampling shadow
#if MAX_POINTLIGHTS > 0
  for (int i = 0; i < MAX_POINTLIGHTS; i++) {
    shadowInfluence = 1.0;
    if(pointLightOn[i]){
   #if HAS_POINTLIGHT_SHADOWMAPS
       if(pointLightCastShadow[i]){
           shadowInfluence = 0.0;
           float lsDepth = vecToDepth(pointLightShadowMapDirection[i], pointLightNearFar[i].x, pointLightNearFar[i].y );
		    float depth = unpackDepth( textureCube(pointLightShadowMap[i], pointLightShadowMapDirection[i])) +  pointLightShadowBias[i];
           if(lsDepth < depth)
               shadowInfluence = 1.0;
       }
       if(shadowInfluence > 0.0){
   #endif
       vec4 lPosition = viewMatrix * vec4( pointLightPosition[ i ], 1.0 );
       vec3 L = lPosition.xyz - fragVertexPosition;
       float dist = length(L);
       L = normalize(L);
       vec3 R = normalize(reflect(L,fragNormal));
       float atten = 1.0 / (pointLightAttenuation[i].x + pointLightAttenuation[i].y * dist + pointLightAttenuation[i].z * dist * dist);
       vec3 Idiff = pointLightIntensity[i] * objDiffuse * max(dot(fragNormal,L),0.0);
   #if HAS_SSAOMAP
       Idiff *= ssao;
   #endif
       vec3 Ispec = pointLightIntensity[i] * objSpecular * pow(max(dot(R,fragEyeVector),0.0), shininess*128.0);
       color = color + (atten*shadowInfluence*(Idiff + Ispec));
   #if HAS_POINTLIGHT_SHADOWMAPS
       }  //pointlight visible
   #endif
     } //pointLight on
  } //pointLight loop
#endif
#if MAX_SPOTLIGHTS > 0
  for (int i=0; i<MAX_SPOTLIGHTS; i++) {
    shadowInfluence = 1.0;
    if(spotLightOn[i]) {
  #if HAS_SPOTLIGHT_SHADOWMAPS
       if(spotLightCastShadow[i]){
           shadowInfluence = 0.0;
           vec4 lspos = spotLightShadowMapCoord[i];
			vec3 perspectiveDivPos = lspos.xyz / lspos.w * 0.5 + 0.5;
			float lsDepth = perspectiveDivPos.z;
			vec2 lightuv = perspectiveDivPos.xy;
			float depth = unpackDepth(texture2D(spotLightShadowMap[i], lightuv)) + spotLightShadowBias[i];
           if(lsDepth < depth)
               shadowInfluence = 1.0;
       }
       if(shadowInfluence > 0.0){
  #endif
       vec4 lPosition = viewMatrix * vec4( spotLightPosition[ i ], 1.0 );
       vec3 L = lPosition.xyz - fragVertexPosition;
       float dist = length(L);
       L = normalize(L);
       vec3 R = normalize(reflect(L,fragNormal));
       float atten = 1.0 / (spotLightAttenuation[i].x + spotLightAttenuation[i].y * dist + spotLightAttenuation[i].z * dist * dist);
       vec3 Idiff = spotLightIntensity[i] * objDiffuse * max(dot(fragNormal,L),0.0);
   #if HAS_SSAOMAP
	    Idiff *= ssao;
   #endif
       vec3 Ispec = spotLightIntensity[i] * objSpecular * pow(max(dot(R,fragEyeVector),0.0), shininess*128.0);
       vec4 lDirection = viewMatrix * vec4(-spotLightDirection[i], 0.0);
       vec3 D = normalize(lDirection.xyz);
       float angle = dot(L, D);
       if(angle > spotLightCosCutoffAngle[i]) {
           float softness = 1.0;
           if (angle < spotLightCosSoftCutoffAngle[i])
               softness = (angle - spotLightCosCutoffAngle[i]) /  (spotLightCosSoftCutoffAngle[i] -  spotLightCosCutoffAngle[i]);
           color += atten*softness*shadowInfluence*(Idiff + Ispec);
       }
   #if HAS_SPOTLIGHT_SHADOWMAPS
       } //light visible if shadow enabled
   #endif
   }  // spotlight on
  } // light loop
#endif
#if MAX_DIRECTIONALLIGHTS > 0
  for (int i=0; i<MAX_DIRECTIONALLIGHTS; i++) {
   shadowInfluence = 1.0;
   if(directionalLightOn[i]){
   #if HAS_DIRECTIONALLIGHT_SHADOWMAPS
       if(directionalLightCastShadow[i]){
           shadowInfluence = 0.0;
           vec4 lspos = directionalLightShadowMapCoord[i];
           vec3 orthogonalDivPos = lspos.xyz / lspos.w *0.5 + 0.5;
           float lsDepth = orthogonalDivPos.z;
           vec2 lightuv = orthogonalDivPos.xy;
               float depth = unpackDepth(texture2D(directionalLightShadowMap[i], lightuv))+directionalLightShadowBias[i];
               if(lsDepth < depth) shadowInfluence = 1.0;
       }
       if(shadowInfluence > 0.0){
   #endif
       vec4 lDirection = viewMatrix * vec4(directionalLightDirection[i], 0.0);
       vec3 L =  normalize(-lDirection.xyz);
       vec3 R = normalize(reflect(L,fragNormal));
       vec3 Idiff = directionalLightIntensity[i] * objDiffuse * max(dot(fragNormal,L),0.0);
   #if HAS_SSAOMAP
       Idiff *= ssao;
   #endif
       vec3 Ispec = directionalLightIntensity[i] * objSpecular * pow(max(dot(R,fragEyeVector),0.0), shininess*128.0);
       color = color + shadowInfluence*((Idiff + Ispec));
   #if HAS_DIRECTIONALLIGHT_SHADOWMAPS
       } //light visible
   #endif
   } //dirLight on
  } // dirLight loop
#endif
  gl_FragColor = vec4(color, alpha);
}
